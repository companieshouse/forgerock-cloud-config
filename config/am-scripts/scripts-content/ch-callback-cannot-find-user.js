var _scriptName = 'CH CALLBACK CANNOT FIND USER';
_log('Starting', 'MESSAGE');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
);

if (callbacks.isEmpty()) {
  action = fr.Action.send(
    new fr.TextOutputCallback(
      fr.TextOutputCallback.ERROR,
      'Password Reset failed - Cannot find a user with this email'
    ),
    new fr.HiddenValueCallback(
      'stage',
      'RESET_PASSWORD_ERROR'
    ),
    new fr.HiddenValueCallback(
      'pagePropsJSON',
      JSON.stringify({
        'errors': [{
          'label': 'Password Reset failed - Cannot find a user with this email',
          'token': 'USER_EMAIL_NOT_FOUND'
        }]
      })
    )
  ).build();
} else {
  outcome = 'false';
}

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END