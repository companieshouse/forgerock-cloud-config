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
  //_log('[STORE PWD IN SESSION] Existing session: ' + existingSession.toString());
  _log('[STORE PWD IN SESSION] Has existing session');
  _log('[STORE PWD IN SESSION] Pwd found in session: ' + (existingSession.get('password') != null));
  sharedState.put('password', existingSession.get('password'));
} else {
  _log('[STORE PWD IN SESSION] no session!');
}

sharedState.put('errorMessage', null);
sharedState.put('pagePropsJSON', null);
var password = transientState.get('password') ? transientState.get('password') : sharedState.get('password');

_log('[STORE PWD IN SESSION] Storing password in session - Pwd set: ' + (password != null) );

action = fr.Action.goTo('true')
  .putSessionProperty('password', password)
  .build();

// LIBRARY START
// LIBRARY END