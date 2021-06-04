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

var isEWF = sharedState.get("EWF-JOURNEY");

if (callbacks.isEmpty()) {
  var companyData = sharedState.get("companyData");
  var infoMessage = "Please enter the company auth code.";
  var errorMessage = sharedState.get("errorMessage");
  var level = fr.TextOutputCallback.INFORMATION;
  if (errorMessage !== null) {
    level = fr.TextOutputCallback.ERROR;
    var errorProps = sharedState.get("pagePropsJSON");
    infoMessage = errorMessage.concat(" Please try again.");
    action = fr.Action.send(
      new fr.TextOutputCallback(level, infoMessage),
      new fr.NameCallback("Enter Auth Code"),
      new fr.HiddenValueCallback("stage", isEWF ? "EWF_LOGIN_4" : "COMPANY_ASSOCIATION_3"),
      new fr.HiddenValueCallback("pagePropsJSON", errorProps)
    ).build();
  } else {
    action = fr.Action.send(
      new fr.TextOutputCallback(level, infoMessage),
      new fr.NameCallback("Enter Auth Code"),
      new fr.HiddenValueCallback("stage", isEWF ? "EWF_LOGIN_4" : "COMPANY_ASSOCIATION_3"),
      new fr.HiddenValueCallback("pagePropsJSON", JSON.stringify({"company": JSON.parse(companyData)}))
    ).build();
  }
} else {
  var credential = callbacks.get(1).getName();

  logger.error("[ENTER AUTH CODE CALLBACK] cleartext auth code: " + credential);

  sharedState.put("credential", credential);
  action = fr.Action.goTo("true").build();
}