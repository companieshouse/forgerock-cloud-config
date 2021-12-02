var _scriptName = 'CH REGISTRATION ERROR USER EXISTS';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
);

if (callbacks.isEmpty()) {
  action = fr.Action.send(
    new fr.TextOutputCallback(
      fr.TextOutputCallback.ERROR,
      'Registration failed - A user with this email already exists!'
    ),
    new fr.HiddenValueCallback(
      'stage',
      'REGISTRATION_ERROR'
    ),
    new fr.HiddenValueCallback(
      'pagePropsJSON',
      JSON.stringify({
          'errors': [{
            label: 'Registration Failed: a user with this email already exists',
            token: 'REGISTRATION_ERROR_USER_ALREADY_EXIST'
          }]
        }
      )
    )
  ).build();
} else {
  outcome = 'false';
}

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END