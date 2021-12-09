var _scriptName = 'CH SEND MFA EMAIL';
_log('Starting');

/* 
  ** INPUT DATA
    * SHARED STATE:
      - 'oneTimePassword' : the OTP code to be sent via email
      - '_id': the user ID to be send the email to (only populated if registrationMFA = false)
      - [optional] 'newEmail': the user email if this script is executed in the 'Change Email Address' journey 

    * TRANSIENT STATE
      - 'registrationMFA' : flag indicating if this script is invoked as part of the registration journey (i.e. the user does not exist in IDM yet)
      - 'notifyJWT': the Notify JWT to be used for requests to Notify
      - 'templates': the list of all Notify templates 

  ** OUTPUT DATA
    * TRANSIENT STATE:
      - 'notificationId': the notification ID returned by Notify if the call was successful
      
    * SHARED STATE:
      - 'mfa-route': the boolean indicating whether this is a SMS or a Email MFA route (email in this case)

    ** OUTCOMES
    - true: message sent successfully
    - false: error in sending message
  
  ** CALLBACKS:
    - error (stage SEND_MFA_SMS_ERROR, error while sending email) 
*/

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
);

var NodeOutcome = {
  TRUE: 'true',
  FALSE: 'false'
};

//extracts the language form headers (default to EN)
function getSelectedLanguage (requestHeaders) {
  if (requestHeaders && requestHeaders.get('Chosen-Language')) {
    var lang = requestHeaders.get('Chosen-Language').get(0);
    _log('selected language: ' + lang);
    return lang;
  }
  _log('no selected language found - defaulting to EN');
  return 'EN';
}

// extracts the email form shared state (for change email journey) or from IDM profile (other journeys)
function extractEmail () {
  var isChangeEmail = sharedState.get('isChangeEmail');
  if (isChangeEmail) {
    return sharedState.get('newEmail');
  } else {
    if (idRepository.getAttribute(userId, 'mail').iterator().hasNext()) {
      return idRepository.getAttribute(userId, 'mail').iterator().next();
    } else {
      _log('Couldn\'t find email address');
      return false;
    }
  }
}

function sendEmail (language, code, emailAddress) {
  var notifyJWT = transientState.get('notifyJWT');
  var templates = transientState.get('notifyTemplates');
  var request = new org.forgerock.http.protocol.Request();
  var requestBodyJson;
  request.setUri(_fromConfig('NOTIFY_EMAIL_ENDPOINT'));
  try {
    requestBodyJson = {
      'email_address': emailAddress,
      'template_id': language === 'EN' ? JSON.parse(templates).en_otpEmail : JSON.parse(templates).cy_otpEmail,
      'personalisation': {
        'code': code
      }
    };
  } catch (e) {
    //_log("[SEND MFA EMAIL] Error while preparing request for Notify: " + e);
    _log('Error while preparing request for Notify: ' + e);
    return {
      success: false,
      message: '[SEND MFA EMAIL] Error while preparing request for Notify: '.concat(e)
    };
  }

  request.setMethod('POST');
  request.getHeaders().add('Content-Type', 'application/json');
  request.getHeaders().add('Authorization', 'Bearer ' + notifyJWT);
  request.getEntity().setString(JSON.stringify(requestBodyJson));

  var notificationId;
  var response = httpClient.send(request).get();

  try {
    notificationId = JSON.parse(response.getEntity().getString()).id;
    transientState.put('notificationId', notificationId);
    _log('Notify ID: ' + notificationId);
    sharedState.put('mfa-route', 'email');
  } catch (e) {
    _log('Error while parsing Notify response: ' + e);
    return {
      success: false,
      message: '[SEND MFA EMAIL] Error while parsing Notify response: '.concat(e)
    };
  }

  return {
    success: (response.getStatus().getCode() === 201),
    message: (response.getStatus().getCode() === 201) ? ('Message sent') : response.getEntity().getString()
  };
}

// execution flow
try {
  var code = sharedState.get('oneTimePassword');
  var userId = sharedState.get('_id');
  var emailAddress = '';
  var language = getSelectedLanguage(requestHeaders);
  var emailAddress = extractEmail();

  _log('User email address: ' + emailAddress);
  _log('Code: ' + code);

  if (!emailAddress) {
    _log('Cannot find email address to send to.');
    action = fr.Action.goTo(NodeOutcome.FALSE).build();
  } else {
    var sendEmailResult = sendEmail(language, code, emailAddress);
    if (sendEmailResult.success) {
      action = fr.Action.goTo(NodeOutcome.TRUE).build();
    } else {

      action = fr.Action.send(
        new fr.HiddenValueCallback(
          'stage',
          'SEND_MFA_EMAIL_ERROR'
        ),
        new fr.TextOutputCallback(
          fr.TextOutputCallback.ERROR,
          'The email could not be sent: '.concat(sendEmailResult.message)
        ),
        new fr.HiddenValueCallback(
          'pagePropsJSON',
          JSON.stringify({
            'errors': [
              {
                label: 'The email could not be sent: '.concat(sendEmailResult.message),
                token: 'SEND_MFA_EMAIL_ERROR'
              }
            ]
          })
        )
      ).build();
    }
  }
} catch (e) {
  _log('Error : ' + e);
  action = fr.Action.send(
    new fr.HiddenValueCallback(
      'stage',
      'SEND_MFA_EMAIL_ERROR'
    ),
    new fr.TextOutputCallback(
      fr.TextOutputCallback.ERROR,
      'The email could not be sent: ' + e.toString()
    ),
    new fr.HiddenValueCallback(
      'pagePropsJSON',
      JSON.stringify({
        'errors': [
          {
            label: 'An error occurred while sending the email. Please try again.',
            token: 'SEND_MFA_EMAIL_ERROR'
          }
        ]
      })
    )
  ).build();
}

// LIBRARY START
// LIBRARY END