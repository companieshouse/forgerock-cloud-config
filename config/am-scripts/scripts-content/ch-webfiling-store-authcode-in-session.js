var _scriptName = 'CH WEBFILING STORE AUTHCODE IN SESSION';
_log('Starting');

/* 
  ** OUTPUT DATA:
    * SESSION:
      - 'authCode' : the plaintext company auth code entered by the user 
       
  ** OUTCOMES
    - true: session updated
*/

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action
);

if (_isAuthenticated()) {
  _log('Existing session: ' + existingSession.toString());
} else {
  _log('no session!');
}

action = fr.Action.goTo('true')
  .putSessionProperty('authCode', sharedState.get('credential'))
  .build();

// LIBRARY START
// LIBRARY END