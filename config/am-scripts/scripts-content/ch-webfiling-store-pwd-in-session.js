var _scriptName = 'CH WEBFILING STORE PWD IN SESSION';
_log('Starting');

/* 
  ** OUTPUT DATA:
    * SESSION:
      - 'authCode' : the plaintext password entered by the user 
       
  ** OUTCOMES
    - true: session updated
*/

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action
);

if (_isAuthenticated()) {
  // _log('Existing session: ' + existingSession.toString());
  _log('Has existing session');
} else {
  _log('no session!');
}

sharedState.put('errorMessage', null);
sharedState.put('pagePropsJSON', null);
var password = transientState.get('password') ? transientState.get('password') : sharedState.get('password');

// _log('Storing password in session: ' + password);

action = fr.Action.goTo('true')
  .putSessionProperty('password', password)
  .build();

// LIBRARY START
// LIBRARY END