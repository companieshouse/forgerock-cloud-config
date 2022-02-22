var _scriptName = 'CH WEBFILING CHECK FOR SESSION';
_log('Starting');

/* 

  ** OUTPUT
    ** SHARED STATE
     - EWF-JOURNEY: boolean indicating the journey is EWF (set to true)
  ** OUTCOMES
    - hasSession: the user has an active session
    - noSession: the user does not have an active session
*/

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
);

var NodeOutcome = {
  HAS_SESSION: 'hasSession',
  NO_SESSION: 'noSession'
};

sharedState.put('EWF-JOURNEY', true);

if (_isAuthenticated()) {
  outcome = NodeOutcome.HAS_SESSION;
  // _log('Existing session: ' + existingSession.toString());
  _log('Has existing session');
} else {
  _log('no session');
  outcome = NodeOutcome.NO_SESSION;
}

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END