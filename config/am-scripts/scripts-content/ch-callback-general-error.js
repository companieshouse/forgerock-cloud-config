/* 
  ** OUTPUT DATA
    * SHARED STATE:
      - [optional] 'errorMessage': error message to display from previous attempts
       
  ** OUTCOMES
    - true: default
  
  ** CALLBACKS:
    - output: stage name and page props for UI
*/

var _scriptName = 'CH CALLBACK GENERAL ERROR';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
);

var errorMessage = sharedState.get('errorMessage') || 'An error occurred';
var errorProps = sharedState.get('pagePropsJSON');
var level = fr.TextOutputCallback.ERROR;

action = fr.Action.send(
  new fr.TextOutputCallback(
    fr.TextOutputCallback.ERROR,
    'Error: ' + errorMessage
  ),
  new fr.HiddenValueCallback(
    'stage',
    'GENERIC_ERROR'
  ),
  new fr.HiddenValueCallback(
    'pagePropsJSON',
    JSON.stringify({ 'errors': [{ 'label': errorMessage, token: 'GENERIC_ERROR' }] })
  )
).build();

outcome = 'true';

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END