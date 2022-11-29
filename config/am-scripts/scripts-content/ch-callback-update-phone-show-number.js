var _scriptName = 'CH CALLBACK UPDATE PHONE SHOW NUMBER';
_log('Starting', 'MESSAGE');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
);

var phoneNumber = sharedState.get('objectAttributes').get('telephoneNumber');

var notificationId = transientState.get('notificationId');
var otpError = transientState.get('error');
_log('Found OTP Error: ' + otpError);

try {
  if (otpError) {
    if (callbacks.isEmpty()) {
      action = fr.Action.send(
        new fr.HiddenValueCallback(
          'pagePropsJSON',
          JSON.stringify(
            {
              'errors': [{
                label: otpError,
                token: 'OTP_NOT_VALID_SMS',
                fieldName: 'IDToken3',
                anchor: 'IDToken3'
              }],
              'phoneNumber': _obfuscatePhone(phoneNumber)
            })
        ),
        new fr.TextOutputCallback(
          fr.TextOutputCallback.ERROR,
          otpError
        )
      ).build();
    }
  } else if (callbacks.isEmpty()) {
    var message = 'Please check your phone';

    action = fr.Action.send(
      new fr.HiddenValueCallback(
        'pagePropsJSON',
        JSON.stringify({ 'phoneNumber': _obfuscatePhone(phoneNumber) })
      ),
      new fr.TextOutputCallback(
        fr.TextOutputCallback.INFORMATION,
        message
      ),
      new fr.HiddenValueCallback(
        'notificationId',
        notificationId
      )
    ).build();
  } else {
    outcome = 'True';
  }
} catch (e) {
  _log('An error occurred: ' + e);
  sharedState.put('errorMessage', e.toString());
  outcome = 'False';
}

// LIBRARY START
// LIBRARY END