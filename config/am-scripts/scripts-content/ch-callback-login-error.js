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
    javax.security.auth.callback.NameCallback,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback
  )
  
logger.error("[LOGIN ERROR CALLBACK] Enter a correct username and password.");

if (callbacks.isEmpty()) {
    var errorMessage = sharedState.get("errorMessage");
    var level = fr.TextOutputCallback.INFORMATION;
    var infoMessage, errorType, errorField;
    if (errorMessage != null) {
      level = fr.TextOutputCallback.ERROR;
      errorType = sharedState.get("loginErrorType");
      errorField = sharedState.get("loginErrorField");
      infoMessage = errorMessage;
      action = fr.Action.send(
        new fr.TextOutputCallback(level, infoMessage),
        new fr.HiddenValueCallback ("stage", "CH_LOGIN_1"),
        new fr.HiddenValueCallback("pagePropsJSON", JSON.stringify({ 'errors': [{ label: infoMessage, token: errorType, fieldName: errorField, anchor: errorField }] }))
      ).build();
    }
}

outcome = "true";