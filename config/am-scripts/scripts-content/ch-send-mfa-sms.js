var _scriptName = 'CH SEND MFA SMS';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
);

function sendErrorCallbacks () {
  if (callbacks.isEmpty()) {
    _log('Called sendErrorCallbacks');

    outcome = 'false';

    var sendSmsSimpleOutcome = sharedState.get('sendSmsSimpleOutcome');

    if (sendSmsSimpleOutcome) {
      _log('Not returning using Action as set to use sendSmsSimpleOutcome');
      return;
    }

    var invalidPhone = sharedState.get('invalidPhone');
    var smsSendError = sharedState.get('smsSendError');

    var pageProps = {
      'errors': [
        {
          label: 'An error occurred while sending the SMS. Please try again.',
          token: 'SEND_MFA_SMS_ERROR'
        }
      ]
    };

    if (invalidPhone) {
      pageProps.invalidPhone = true;
    }

    if (smsSendError) {
      pageProps.smsSendError = true;
    }

    var pagePropsJSON = JSON.stringify(pageProps);
    _log('pagePropsJSON = ' + pagePropsJSON, 'MESSAGE');

    var errorStageName = 'REGISTRATION_1';
    var journeyName = _getJourneyName();

    _log('JOURNEY NAME = ' + journeyName);

    if (journeyName && String(journeyName) === 'CHChangePhoneNumber') {
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
        'The SMS could not be sent. Please try again.'
      ),
      new fr.HiddenValueCallback(
        'pagePropsJSON',
        pagePropsJSON
      )
    ).build();
  }
}

function sendTextMessage (language, phoneNumber, code) {
  sharedState.put('invalidPhone', null);
  sharedState.put('smsSendError', null);

  var notifyJWT = transientState.get('notifyJWT');
  var templates = transientState.get('notifyTemplates');
  var requestBodyJson;
  _log('JWT from transient state: ' + notifyJWT, 'MESSAGE');
  _log('Templates from transient state: ' + templates);

  var request = new org.forgerock.http.protocol.Request();
  request.setUri(_fromConfig('NOTIFY_SMS_ENDPOINT'));

  try {
    requestBodyJson = {
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

  try {
    request.setMethod('POST');
    request.getHeaders().add('Content-Type', 'application/json');
    request.getHeaders().add('Authorization', 'Bearer ' + notifyJWT);
    request.getEntity().setString(JSON.stringify(requestBodyJson));

    var notificationId;
    var response = httpClient.send(request).get();
    // _log('Notify Response: ' + response.getStatus().getCode() + ' cause= ' + response.getCause() + ' body=' + response.getEntity().getString());
    _log('Notify Response: ' + response.getStatus().getCode() + ' cause= ' + response.getCause());

    try {
      notificationId = JSON.parse(response.getEntity().getString()).id;

      _log('Notify ID: ' + notificationId);

      transientState.put('notificationId', notificationId);
      sharedState.put('mfa-route', 'sms');
    } catch (e) {
      _log('Error while parsing Notify response: ' + e);
      return false;
    }

    // _log('Notify Response: ' + response.getStatus().getCode() + response.getCause() + response.getEntity().getString());
    _log('Notify Response: ' + response.getStatus().getCode() + ' cause=' + response.getCause());

    var notifyCode = response.getStatus().getCode();

    if (notifyCode === 400) {
      sharedState.put('invalidPhone', true);
    } else if (notifyCode > 400) {
      sharedState.put('smsSendError', true);
    }

    return notifyCode === 201;
  } catch (e) {
    _log('Error sending via Notify : ' + e);
    return false;
  }
}

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
  outcome = 'false';

  var code = sharedState.get('oneTimePassword');
  var isRegistrationMFA = sharedState.get('registrationMFA');

  // _log('Code: ' + code);

  var language = _getSelectedLanguage(requestHeaders);
  var phoneNumber = extractPhoneNumber();

  if (!phoneNumber || phoneNumber === 'false' || !code) {
    sendErrorCallbacks();
  } else {
    if (sendTextMessage(language, phoneNumber, code)) {
      outcome = 'true';
    } else {
      sendErrorCallbacks();
    }
  }
} catch (e) {
  _log('Error : ' + e);
  sharedState.put('errorMessage', e.toString());
  outcome = 'false';
}

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END