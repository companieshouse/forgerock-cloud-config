/* 
  ** INPUT DATA:
    * SHARED STATE:
      - 'companyData' : the company info
      - [optional] 'pagePropsJSON': additional info to display
       
  ** OUTCOMES
    - true: input collected
    - false: handled error occurred
    - false: unhandled error occurred
  
  ** CALLBACKS: 
    - input: user confirmation choice (YES or NO)
    - output: company info
    - output: prompt to enter company no, or error message (if any)
    - output: stage name and page props for UI
*/

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback,
  javax.security.auth.callback.ConfirmationCallback
)

var NodeOutcome = {
  TRUE: "true",
  FALSE: "false",
  ERROR: "error"
}

var YES_OPTION_INDEX = 0;

try {
  var companyData = sharedState.get("companyData");
  if (callbacks.isEmpty()) {
    var infoMessage = "Do you want to add this company to your Companies House account?";
    var errorMessage = sharedState.get("errorMessage");
    var level = fr.TextOutputCallback.INFORMATION;
    if (errorMessage !== null) {
      var errorProps = sharedState.get("pagePropsJSON");
      level = fr.TextOutputCallback.ERROR;
      infoMessage = errorMessage.concat(" Please try again.");
      action = fr.Action.send(
        new fr.TextOutputCallback(level, infoMessage),
        new fr.ConfirmationCallback(
          "Do you want to add this company to your Companies House account?",
          fr.ConfirmationCallback.INFORMATION,
          ["YES", "NO"],
          YES_OPTION_INDEX
        ),
        new fr.HiddenValueCallback("stage", "EWF_LOGIN_5"),
        new fr.HiddenValueCallback("pagePropsJSON", errorProps)
      ).build();
    } else {
      action = fr.Action.send(
        new fr.TextOutputCallback(level, infoMessage),
        new fr.ConfirmationCallback(
          "Do you want to add this company to your Companies House account?",
          fr.ConfirmationCallback.INFORMATION,
          ["YES", "NO"],
          YES_OPTION_INDEX
        ),
        new fr.HiddenValueCallback("stage", "EWF_LOGIN_5"),
        new fr.HiddenValueCallback(
          "pagePropsJSON",
          JSON.stringify({ "company": JSON.parse(companyData) })
        )
      ).build();
    }
  } else {
    var selection = callbacks.get(1).getSelectedIndex();
    logger.error("[EWF CONFIRM ASSOCIATION] selection " + selection);
    if (selection === YES_OPTION_INDEX) {
      logger.error("[EWF CONFIRM ASSOCIATION] selected YES");
      sharedState.put("errorMessage", null);
      sharedState.put("pagePropsJSON", null);
      outcome = NodeOutcome.TRUE;
    } else {
      sharedState.put("errorMessage", null);
      outcome = NodeOutcome.FALSE;
    }

    action = fr.Action.goTo("true").build();
  }

} catch (e) {
  logger.error("[EWF CONFIRM ASSOCIATION] ERROR: " + e);
  outcome = NodeOutcome.error;
}