var _scriptName = 'CH CALLBACK SHOW PHONE OR MAIL'

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
)

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

if (otpError) {
  if (callbacks.isEmpty()) {
    action = fr.Action.send(
      new fr.HiddenValueCallback(
        'pagePropsJSON',
        JSON.stringify(
          {
            'errors': [
              {
                label: otpError,
                token: (mfaRoute === 'sms' ? 'OTP_NOT_VALID_SMS' : (mfaRoute === 'email' ? 'OTP_NOT_VALID_EMAIL' : 'OTP_NOT_VALID')),
                fieldName: 'IDToken3',
                anchor: 'IDToken3'
              }
            ],
            'phoneNumber': _obfuscatePhone(phoneNumber),
            'emailAddress': _obfuscateEmail(emailAddress),
            'type': mfaRoute
          }
        )
      ),
      new fr.TextOutputCallback(
        fr.TextOutputCallback.ERROR,
        otpError
      )
    ).build()
  }
} else if (callbacks.isEmpty()) {
  var message = ''
  if (mfaRoute === 'sms') {
    message = 'Please check your phone'
  } else if (mfaRoute === 'email') {
    message = 'Please check your email'
  }

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
    )
  ).build()
} else {
  outcome = 'True'
}

// LIBRARY START
// LIBRARY END