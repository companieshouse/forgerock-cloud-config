var _scriptName = 'CH CAPTURE OTP RESPONSE';
_log('Starting', 'MESSAGE');

var NodeOutcome = {
  CORRECT: 'correct',
  INCORRECT: 'incorrect',
  RESEND: 'resend',
  ERROR: 'error',
  SEND_SMS: 'sendSMS'
};

var ConfirmIndex = {
  RESEND: 0,
  NEXT: 1,
  SEND_SMS: 2
};

var config = {
  otpSharedStateVariable: 'oneTimePassword',
  otpCheckStageNameVariable: 'otpCheckStageName'
};

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  javax.security.auth.callback.PasswordCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback,
  com.sun.identity.authentication.callbacks.ScriptTextOutputCallback,
  javax.security.auth.callback.ConfirmationCallback,
  java.lang.String
);

function getMfaRouteOptions (mfaRoute) {
  // mfaRoute = sms or email
  return ['RESEND', 'NEXT', 'SEND_SMS'];
}

function getPhoneNumber(userId){
  if (isUpdatePhoneNumber && newPhoneNumber) {
    return newPhoneNumber;
  } else {
    if (idRepository.getAttribute(userId, 'telephoneNumber').iterator().hasNext()) {
      return idRepository.getAttribute(userId, 'telephoneNumber').iterator().next();
    } else {
      _log('Couldn\'t find telephoneNumber from user record');

      if (sharedState.get('objectAttributes')) {
        return sharedState.get('objectAttributes').get('telephoneNumber');
      }
    }
  }
}

var phoneNumber = '';

var isUpdatePhoneNumber = sharedState.get('updatePhoneNumber');
var newPhoneNumber = sharedState.get('newPhoneNumber');

var emailAddress = '';

var notificationId = transientState.get('notificationId');
var mfaRoute = sharedState.get('mfa-route');

try {
  var userId = sharedState.get('_id');
  phoneNumber = getPhoneNumber(userId)

 if (mfaRoute === 'email') {
    var isChangeEmail = sharedState.get('isChangeEmail');
    if (isChangeEmail) {
      emailAddress = sharedState.get('newEmail');
    } else {
      if (idRepository.getAttribute(userId, 'mail').iterator().hasNext()) {
        emailAddress = idRepository.getAttribute(userId, 'mail').iterator().next();
      } else {
        _log('Couldn\'t find emailAddress from user record');
      }
    }
  } else if (mfaRoute !== 'sms') {
    _log('Couldn\'t determine route used for sending MFA code');
  }
} catch (e) {
  _log('Error retrieving user details: ' + e);
}

if (callbacks.isEmpty()) {
  var otpError = sharedState.get('otpError');
  var otpResend = sharedState.get('otpResend');
  _log('Found OTP Flags : otpError = ' + otpError + ', otpResend = ' + otpResend);

  var message = '';
  if (mfaRoute === 'sms') {
    message = 'Please check your phone';
  } else if (mfaRoute === 'email') {
    message = 'Please check your email';
  }

  var checkOtpStageName = sharedState.get(config.otpCheckStageNameVariable);
  if (!checkOtpStageName) {
    checkOtpStageName = 'NO_OTP_CHECK_STAGE_NAME';
  }

  _log('OTP stage name : ' + checkOtpStageName);

  var pageProps = {
    'phoneNumber': _obfuscatePhone(phoneNumber),
    'emailAddress': _obfuscateEmail(emailAddress),
    'type': mfaRoute
  };

  if (otpError) {
    pageProps.incorrect = otpError;

    if (mfaRoute === 'sms') {
      pageProps.errors = [{
        label: 'Enter the security code exactly as it is shown in the text message',
        token: 'OTP_NOT_VALID_SMS',
        fieldName: 'IDToken4',
        anchor: 'IDToken4'
      }];
    } else if (mfaRoute === 'email') {
      pageProps.errors = [{
        label: 'Enter the security code exactly as it is shown in the email',
        token: 'OTP_NOT_VALID_EMAIL',
        fieldName: 'IDToken4',
        anchor: 'IDToken4'
      }];
    }
  }

  if (otpResend) {
    pageProps.resend = otpResend;
  }

  action = fr.Action.send(
    new fr.HiddenValueCallback(
      'pagePropsJSON',
      JSON.stringify(pageProps)
    ),
    new fr.TextOutputCallback(
      fr.TextOutputCallback.INFORMATION,
      message
    ),
    new fr.HiddenValueCallback(
      'notificationId',
      notificationId
    ),
    new fr.PasswordCallback('Security Code', false),
    new fr.ConfirmationCallback(
      'Do you want to resend?',
      fr.ConfirmationCallback.INFORMATION,
      getMfaRouteOptions(mfaRoute),
      1),
    new fr.HiddenValueCallback('stage', checkOtpStageName),
    new fr.HiddenValueCallback('description', 'Please enter the code you received'),
    new fr.HiddenValueCallback('header', 'Please enter your code'),
  ).build();
} else {

  sharedState.put('otpError', null);
  sharedState.put('otpResend', null);

  resend = 'false';
  var sendSMS = false
  var confirmIndex = callbacks.get(4).getSelectedIndex();
  if (confirmIndex === ConfirmIndex.RESEND) {
    resend = 'true';
  } else if (confirmIndex === ConfirmIndex.SEND_SMS) {
    sendSMS = true;
  }

  var otp = fr.String(callbacks.get(3).getPassword());
  var correctOtp = sharedState.get(config.otpSharedStateVariable);

  _log('Resend = ' + resend, 'MESSAGE');

  if (resend === 'true') {
    _log('Resend requested', 'MESSAGE');
    sharedState.put('otpResend', true);
    outcome = NodeOutcome.RESEND;
  } else if (sendSMS === true) {
    _log('send SMS requested', 'MESSAGE');
    outcome = NodeOutcome.SEND_SMS;
  } else if (!correctOtp) {
    _log('No OTP in shared state', 'MESSAGE');
    outcome = NodeOutcome.ERROR;
  } else if (!otp.equals(correctOtp)) {
    _log('Incorrect OTP');
    sharedState.put('otpError', true);
    outcome = NodeOutcome.INCORRECT;
  } else {
    _log('Correct OTP', 'MESSAGE');
    outcome = NodeOutcome.CORRECT;
  }

}

_log('Outcome : ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END