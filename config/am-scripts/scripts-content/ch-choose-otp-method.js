var _scriptName = 'CH CHOOSE OTP'

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
)

var phoneNumber = ''
var emailAddress = ''

_log('Starting request of OTP Method')

try {
  var userId = sharedState.get('_id')

  _log('UserId : ' + userId)

  if (idRepository.getAttribute(userId, 'telephoneNumber').iterator().hasNext()) {
    phoneNumber = idRepository.getAttribute(userId, 'telephoneNumber').iterator().next()
    _log('phoneNumber : ' + phoneNumber)
  } else {
    _log('Couldn\'t find telephoneNumber')
  }

  if (idRepository.getAttribute(userId, 'mail').iterator().hasNext()) {
    emailAddress = idRepository.getAttribute(userId, 'mail').iterator().next()
    _log('emailAddress : ' + emailAddress)
  } else {
    _log('Couldn\'t find emailAddress')
  }
} catch (e) {
  _log('Error retrieving user details: ' + e)
}

var userDetailsJSON = JSON.stringify({
  'phoneNumber': _obfuscatePhone(phoneNumber),
  'emailAddress': _obfuscateEmail(emailAddress)
})

_log('User Details JSON : ' + userDetailsJSON)

if (callbacks.isEmpty()) {
  var confirmMessage = 'How do you want to confirm it\'s you?'
  var optOptions = ['email', 'text']

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
  ).build()
} else {
  var otpMethod = callbacks.get(0).getSelectedIndexes()[0]

  _log('OTP Method Requested : ' + otpMethod)

  if (otpMethod === 0) {
    outcome = 'email'
  } else {
    outcome = 'text'
  }

  _log('Outcome = ' + outcome)
}

// LIBRARY START
// LIBRARY END