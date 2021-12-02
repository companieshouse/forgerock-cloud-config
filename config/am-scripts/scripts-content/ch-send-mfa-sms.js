/* 
  ** INPUT DATA
    * SHARED STATE:
      - 'oneTimePassword' : the OTP code to be sent via text
      - '_id': the user ID to be send the text to (only populated if registrationMFA = false)
      - 'objectAttributes.telephoneNumber': the user telephone number (entered in a previous screen)

    * TRANSIENT STATE
      - 'registrationMFA' : flag indicating if this script is invoked as part of the registration journey (i.e. the user does not exist in IDM yet)
      - 'notifyJWT': the Notify JWT to be used for requests to Notify
      - 'templates': the list of all Notify templates 

  ** OUTPUT DATA
    * TRANSIENT STATE:
      - 'notificationId': the notification ID returned by Notify if the call was successful
      
    * SHARED STATE:
      - 'mfa-route': the boolean indicating whether this is a SMS or a Email MFA route (SMS in this case)

    ** OUTCOMES
    - true: message sent successfully
    - false: error in sending message
  
  ** CALLBACKS:
    - error (stage SEND_MFA_SMS_ERROR, error while sending SMS) 
*/

var _scriptName = 'CH SEND MFA SMS';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
);

// sends the error callbacks
function sendErrorCallbacks () {
  if (callbacks.isEmpty()) {
    action = fr.Action.send(
      new fr.HiddenValueCallback(
        'stage',
        'SEND_MFA_SMS_ERROR'
      ),
      new fr.TextOutputCallback(
        fr.TextOutputCallback.ERROR,
        'The SMS could not be sent. Please try again.'
      ),
      new fr.HiddenValueCallback(
        'pagePropsJSON',
        JSON.stringify({
          'errors': [
            {
              label: 'An error occurred while sending the SMS. Please try again.',
              token: 'SEND_MFA_SMS_ERROR'
            }
          ]
        })
      )
    ).build();
  }
}

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

// sends the OTP code via text to the number specified
function sendTextMessage (language, phoneNumber, code) {
  var notifyJWT = transientState.get('notifyJWT');
  var templates = transientState.get('notifyTemplates');

  _log('JWT from transient state: ' + notifyJWT);
  _log('Templates from transient state: ' + templates);

  var request = new org.forgerock.http.protocol.Request();
  request.setUri('https://api.notifications.service.gov.uk/v2/notifications/sms');

  try {
    var requestBodyJson = {
      'phone_number': phoneNumber,
      'template_id': language === 'EN' ? JSON.parse(templates).en_otpSms : JSON.parse(templates).cy_otpSms,
      'personalisation': {
        'code': code
      }
    };
  } catch (e) {
    _log('Error while preparing request for Notify: ' + e);
    return false;
  }

  request.setMethod('POST');
  request.getHeaders().add('Content-Type', 'application/json');
  request.getHeaders().add('Authorization', 'Bearer ' + notifyJWT);
  request.getEntity().setString(JSON.stringify(requestBodyJson));

  var notificationId;
  var response = httpClient.send(request).get();
  _log('Notify Response: ' + response.getStatus().getCode() + response.getCause() + response.getEntity().getString());

  try {
    notificationId = JSON.parse(response.getEntity().getString()).id;

    _log('Notify ID: ' + notificationId);

    transientState.put('notificationId', notificationId);
    sharedState.put('mfa-route', 'sms');
  } catch (e) {
    _log('Error while parsing Notify response: ' + e);
    return false;
  }

  _log('Notify Response: ' + response.getStatus().getCode() + response.getCause() + response.getEntity().getString());

  return response.getStatus().getCode() === 201;
}

// extracts the number from the user profile (for password reset) or from shared state (for registration)
function extractPhoneNumber () {
  var userId = sharedState.get('_id');
  var isUpdatePhoneNumber = sharedState.get('updatePhoneNumber');

  if (isRegistrationMFA || isUpdatePhoneNumber) {
    return sharedState.get('objectAttributes').get('telephoneNumber');
  } else {
    if (idRepository.getAttribute(userId, 'telephoneNumber').iterator().hasNext()) {
      return idRepository.getAttribute(userId, 'telephoneNumber').iterator().next();
    } else {
      _log('Couldn\'t find telephoneNumber');
      return false;
    }
  }
}

// main execution flow
try {
  var code = sharedState.get('oneTimePassword');
  var isRegistrationMFA = sharedState.get('registrationMFA');

  _log('Code: ' + code);

  var language = getSelectedLanguage(requestHeaders);

  var phoneNumber = extractPhoneNumber();
  if (!phoneNumber || phoneNumber === 'false' || !code) {
    sendErrorCallbacks();
  }

  _log('User phoneNumber: ' + phoneNumber);

  if (sendTextMessage(language, phoneNumber, code)) {
    action = fr.Action.goTo('true').build();
  } else {
    sendErrorCallbacks();
  }
} catch (e) {
  _log('Error : ' + e);
  sharedState.put('errorMessage', e.toString());
  outcome = 'false';
}

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END