var _scriptName = 'CH CALLBACK LOGIN ERROR';
_log('Starting');

/* 
  ** OUTPUT DATA
    * SHARED STATE:
      - [optional] 'errorMessage': error message to display from previous attempts
       
  ** OUTCOMES
    - true: default
  
  ** CALLBACKS:
    - output: stage name and page props for UI
*/

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
);

if (callbacks.isEmpty()) {
  var errorMessage = sharedState.get('errorMessage');
  var level = fr.TextOutputCallback.INFORMATION;
  var infoMessage;
  var errorProps;
  if (errorMessage !== null) {
    _log('Generating callback for error: ' + errorMessage);
    level = fr.TextOutputCallback.ERROR;
    errorProps = sharedState.get('pagePropsJSON');
    infoMessage = errorMessage;
    action = fr.Action.send(
      new fr.TextOutputCallback(level, infoMessage),
      new fr.HiddenValueCallback('stage', 'CH_LOGIN_1'),
      new fr.HiddenValueCallback('pagePropsJSON', errorProps)
    ).build();
  }
}

outcome = 'true';

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END