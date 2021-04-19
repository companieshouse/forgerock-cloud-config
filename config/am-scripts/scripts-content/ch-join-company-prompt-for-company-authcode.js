/* 
  ** OUTPUT DATA
    * SHARED STATE:
      - 'credential' : the company auth code entered by the user
      - [optional] 'errorMessage': error message to display from previous attempts
       
  ** OUTCOMES
    - true: input collected
  
  ** CALLBACKS: 
    - input: company auth code
    - output: prompt to enter auth code, or error message (if any)
    - output: stage name and page props for UI
*/

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.NameCallback,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
)

if (callbacks.isEmpty()) {
  var infoMessage = "Please enter the company auth code.";
  var errorMessage = sharedState.get("errorMessage");
  var level = fr.TextOutputCallback.INFORMATION;
  var errorType, errorField;
  if (errorMessage != null) {
    level = fr.TextOutputCallback.ERROR;
    errorType = sharedState.get("createRelationshipErrorType");
    errorField = sharedState.get("createRelationshipErrorField");
    infoMessage = errorMessage.concat(" Please try again.");
    action = fr.Action.send(
      new fr.TextOutputCallback(level, infoMessage), 
      new fr.NameCallback("Enter Auth Code"),
      new fr.HiddenValueCallback ("stage", "COMPANY_ASSOCIATION_3"),
      new fr.HiddenValueCallback("pagePropsJSON", JSON.stringify({ 'errors': [{ label: infoMessage, token: errorType, fieldName: errorField, anchor: errorField }] }))
    ).build();
  } else { 
    action = fr.Action.send(
      new fr.TextOutputCallback(level, infoMessage), 
      new fr.NameCallback("Enter Auth Code"),
      new fr.HiddenValueCallback ("stage", "COMPANY_ASSOCIATION_3")
    ).build();
  }
} else {
  var credential = callbacks.get(1).getName();
  
  logger.error("[ENTER AUTH CODE CALLBACK] cleartext auth code: " + credential);

  sharedState.put("credential", credential);
  action = fr.Action.goTo("true").build();
}