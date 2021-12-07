var _scriptName = 'CH UPDATE LEGACY PASSWORD CHECK ORIGINAL';
_log('Starting');

/*
  ** INPUT DATA
    * SHARED STATE:
      - 'credential' : the user-entered password.
    * TRANSIENT STATE
      - 'password' : the password as entered as the user's current password in the password collector
  ** OUTPUT DATA
    * TRANSIENT STATE:
      - 'password': the password successfully set on the user
    * SHARED STATE:
      - 'errorMessage': message indicating that the current password supplied is incorrect. Will be displayed subsequently in the collector
  ** OUTCOMES
    - match: password values match
    - mismatch: password values do not match
*/

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action
);

var NodeOutcome = {
  MATCH: 'match',
  MISMATCH: 'mismatch',
};

function checkUserPassword (userEnteredPassword, passwordFromCollector) {

  _log('Comparing ' + userEnteredPassword + ' with ' + passwordFromCollector);
  if (!userEnteredPassword.equals(passwordFromCollector)) {
    sharedState.put('errorMessage', 'The current password you supplied is incorrect.');
    _log('The current password you supplied is correct');
    return NodeOutcome.MISMATCH;
  }
  return NodeOutcome.MATCH;
}

var userEnteredPassword = sharedState.get('credential');
var passwordFromCollector = transientState.get('password');

outcome = checkUserPassword(userEnteredPassword, passwordFromCollector);

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END