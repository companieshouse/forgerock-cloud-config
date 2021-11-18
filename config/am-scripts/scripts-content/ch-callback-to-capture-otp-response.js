var _scriptName = 'CH CAPTURE OTP RESPONSE'

var NodeOutcome = {
  CORRECT: 'correct',
  INCORRECT: 'incorrect',
  RESEND: 'resend',
  ERROR: 'error'
}

var ConfirmIndex = {
  RESEND: 0,
  NEXT: 1
}

var config = {
  otpSharedStateVariable: 'oneTimePassword',
  otpCheckStageNameVariable: 'otpCheckStageName'
}

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  javax.security.auth.callback.PasswordCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback,
  com.sun.identity.authentication.callbacks.ScriptTextOutputCallback,
  javax.security.auth.callback.ConfirmationCallback,
  java.lang.String
)

function getMfaRouteOptions (mfaRoute) {
  // mfaRoute = sms or email
  return ['RESEND', 'NEXT']
}

var phoneNumber = ''
var emailAddress = ''
var notificationId = transientState.get('notificationId')
var mfaRoute = sharedState.get('mfa-route')
var otpError = transientState.get('error')

_log('Found OTP Error : ' + otpError)

try {
  var userId = sharedState.get('_id')

  if (mfaRoute === 'sms') {
    if (idRepository.getAttribute(userId, 'telephoneNumber').iterator().hasNext()) {
      phoneNumber = idRepository.getAttribute(userId, 'telephoneNumber').iterator().next()
      _log('phoneNumber : ' + phoneNumber)
    } else {
      _log('Couldn\'t find telephoneNumber')
    }
  } else if (mfaRoute === 'email') {
    var isChangeEmail = sharedState.get('isChangeEmail')
    if (isChangeEmail) {
      emailAddress = sharedState.get('newEmail')
      _log('emailAddress from change email journey: ' + emailAddress)
    } else {
      if (idRepository.getAttribute(userId, 'mail').iterator().hasNext()) {
        emailAddress = idRepository.getAttribute(userId, 'mail').iterator().next()
        _log('emailAddress : ' + emailAddress)
      } else {
        _log('Couldn\'t find emailAddress')
      }
    }
  } else {
    _log('Couldn\'t determine route used for sending MFA code')
  }
} catch (e) {
  _log('Error retrieving user details: ' + e)
}

if (callbacks.isEmpty()) {
  var message = ''
  if (mfaRoute === 'sms') {
    message = 'Please check your phone'
  } else if (mfaRoute === 'email') {
    message = 'Please check your email'
  }

  var checkOtpStageName = sharedState.get(config.otpCheckStageNameVariable)
  if (!checkOtpStageName) {
    checkOtpStageName = 'NO_OTP_CHECK_STAGE_NAME'
  }

  _log('OTP stage name : ' + checkOtpStageName)

  action = fr.Action.send(
    new fr.HiddenValueCallback(
      'pagePropsJSON',
      JSON.stringify({
        'phoneNumber': _obfuscatePhone(phoneNumber),
        'emailAddress': _obfuscateEmail(emailAddress),
        'type': mfaRoute
      })
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
    new fr.HiddenValueCallback('header', 'Please enter your code')
  ).build()
} else {

  resend = 'false'
  var confirmIndex = callbacks.get(4).getSelectedIndex()
  if (confirmIndex === ConfirmIndex.RESEND) {
    resend = 'true'
  }

  var otp = fr.String(callbacks.get(3).getPassword())
  var correctOtp = sharedState.get(config.otpSharedStateVariable)

  _log('Resend = ' + resend + ', correctOtp = ' + correctOtp)

  if (resend === 'true') {
    _log('Resend requested')
    outcome = NodeOutcome.RESEND
  } else if (!correctOtp) {
    _log('No OTP in shared state')
    outcome = NodeOutcome.ERROR
  } else if (!otp.equals(correctOtp)) {
    _log('Incorrect OTP')
    outcome = NodeOutcome.INCORRECT
  } else {
    _log('Correct OTP')
    outcome = NodeOutcome.CORRECT
  }

}

// LIBRARY START
// LIBRARY END