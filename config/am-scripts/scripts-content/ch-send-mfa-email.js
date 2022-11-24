var _scriptName = 'CH SEND MFA EMAIL';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
);

var NodeOutcome = {
  TRUE: 'true',
  FALSE: 'false'
};

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
  var language = _getSelectedLanguage(requestHeaders);
  var emailAddress = extractEmail();

  _log('User email address: ' + emailAddress, 'MESSAGE');
  // _log('Code: ' + code);

  if (!emailAddress) {
    _log('Cannot find email address to send to.');
    action = fr.Action.goTo(NodeOutcome.FALSE).build();
  } else {
    var sendEmailResult = sendEmail(language, code, emailAddress);
    if (sendEmailResult.success) {
      action = fr.Action.goTo(NodeOutcome.TRUE).build();
    } else {

      var errorStageName = 'REGISTRATION_1';
      var journeyName = _getJourneyName();

      _log('JOURNEY NAME = ' + journeyName);

      if (journeyName && String(journeyName) === 'CHChangeEmailAddress') {
        errorStageName = 'GENERIC_ERROR';
      }

      _log('USING errorStageName = ' + errorStageName);

      action = fr.Action.send(
        new fr.HiddenValueCallback(
          'stage',
          errorStageName
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