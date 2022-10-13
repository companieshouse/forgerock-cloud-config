var _scriptName = 'CH PASSWORD RESET PWD UPDATED';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
);

var NodeOutcome = {
  TRUE: 'true',
  ERROR: 'error'
};

try {
  if (callbacks.isEmpty()) {
    action = fr.Action.send(
      new fr.TextOutputCallback(
        fr.TextOutputCallback.INFORMATION,
        'The password has been updated successfully. Please login'
      ),
      new fr.HiddenValueCallback(
        'stage',
        'RESET_PASSWORD_5'
      )
    ).build();
  } else {
    outcome = NodeOutcome.SUCCESS;
  }
} catch (e) {
  sharedState.put('errorMessage', 'Error in resetting the onboarding date: ' + e);
  outcome = NodeOutcome.ERROR;
}

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END