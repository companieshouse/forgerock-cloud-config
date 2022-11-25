var _scriptName = 'CH CHOOSE OTP';
_log('Starting', 'MESSAGE');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  javax.security.auth.callback.PasswordCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback,
  com.sun.identity.authentication.callbacks.ScriptTextOutputCallback,
  javax.security.auth.callback.ConfirmationCallback,
  javax.security.auth.callback.ChoiceCallback,
  javax.security.auth.callback.NameCallback,
  java.lang.String
);

var phoneNumber = '';
var emailAddress = '';

_log('Starting request of Choose OTP Method', 'MESSAGE');

try {
  var userId = sharedState.get('_id');

  if (idRepository.getAttribute(userId, 'telephoneNumber').iterator().hasNext()) {
    phoneNumber = idRepository.getAttribute(userId, 'telephoneNumber').iterator().next();
  } else {
    _log('Couldn\'t find telephoneNumber');
  }

  if (idRepository.getAttribute(userId, 'mail').iterator().hasNext()) {
    emailAddress = idRepository.getAttribute(userId, 'mail').iterator().next();
  } else {
    _log('Couldn\'t find emailAddress');
  }
} catch (e) {
  _log('Error retrieving user details: ' + e);
}

var userDetailsJSON = JSON.stringify({
  'phoneNumber': _obfuscatePhone(phoneNumber),
  'emailAddress': _obfuscateEmail(emailAddress)
});

if (callbacks.isEmpty()) {
  var confirmMessage = 'How do you want to confirm it\'s you?';
  var optOptions = ['email', 'text'];

  action = fr.Action.send(
    new fr.ChoiceCallback(
      confirmMessage,
      optOptions,
      0,
      false
    ),
    new fr.HiddenValueCallback('stage', 'EWF_LOGIN_OTP_METHOD'),
    new fr.HiddenValueCallback(
      'pagePropsJSON',
      userDetailsJSON
    ),
    new fr.HiddenValueCallback('description', confirmMessage),
    new fr.HiddenValueCallback('header', confirmMessage)
  ).build();
} else {
  var otpMethod = callbacks.get(0).getSelectedIndexes()[0];

  _log('OTP Method Requested : ' + otpMethod, 'MESSAGE');

  if (otpMethod === 0) {
    sharedState.put('mfa-route', 'email');
    outcome = 'email';
  } else {
    sharedState.put('mfa-route', 'sms');
    outcome = 'text';
  }

  _log('Outcome = ' + _getOutcomeForDisplay());
}

// LIBRARY START
// LIBRARY END