/* 
  ** OUTPUT DATA
    * SHARED STATE:
      - 'companyNumber' : the company number entered by the user
      - [optional] 'errorMessage': error message to display from previous attempts
       
  ** OUTCOMES
    - true: input collected
  
  ** CALLBACKS: 
    - input: company number
    - output: prompt to enter company no, or error message (if any)
    - output: stage name and page props for UI
*/

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.NameCallback,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback,
  javax.security.auth.callback.ChoiceCallback
)

var jurisdictions = ["EW", "SC", "NI"];

if (callbacks.isEmpty()) {
  var infoMessage = "Please enter the company number.";
  var errorMessage = sharedState.get("errorMessage");
  var level = fr.TextOutputCallback.INFORMATION;
  if (errorMessage !== null) {
    var errorProps = sharedState.get("pagePropsJSON");
    level = fr.TextOutputCallback.ERROR;
    infoMessage = errorMessage.concat(" Please try again.");
    action = fr.Action.send(
      new fr.TextOutputCallback(level, infoMessage),
      new fr.ChoiceCallback(
        "Where was the company registered?",
        jurisdictions,
        0,
        false
      ),
      new fr.NameCallback("Enter Company number"),
      new fr.HiddenValueCallback("stage", "COMPANY_ASSOCIATION_1"),
      new fr.HiddenValueCallback("pagePropsJSON", errorProps)
    ).build();
  } else {
    action = fr.Action.send(
      new fr.TextOutputCallback(level, infoMessage),
      new fr.ChoiceCallback(
        "Where was the company registered?",
        jurisdictions,
        0,
        false
      ),
      new fr.NameCallback("Enter Company number"),
      new fr.HiddenValueCallback("stage", "COMPANY_ASSOCIATION_1")
    ).build();
  }
} else {
  var jurisdictionIndex = callbacks.get(1).getSelectedIndexes()[0];
  logger.error("[PROMPT COMPANY NO] jurisdiction: " + jurisdictions[jurisdictionIndex]);

  var companyNumber = callbacks.get(2).getName();
  logger.error("[ENTER COMPANY NO CALLBACK] companyNumber: " + companyNumber);
  sharedState.put("jurisdiction", jurisdictions[jurisdictionIndex]);
  sharedState.put("companyNumber", companyNumber);
  action = fr.Action.goTo("true").build();
}