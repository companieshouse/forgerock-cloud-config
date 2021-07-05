/* 
  ** INPUT DATA
    * QUERY PARAMS
     - companyNo: (optional) the comapny number to be looked up 

  ** OUTPUT DATA
    * SHARED STATE:
      - 'companyNumber' : the company number entered by the user
      - 'jurisdiction': the selected company jurisdiction
      - [optional] 'errorMessage': error message to display from previous attempts
      - 'skipConfirmation': the flag used to skip the company selection confirmation step
    * SESSION:
      - 'companyNumber': the selected company number
      - 'jurisdiction': the selected company jurisdiction

  ** OUTCOMES
    - true: input collected
  
  ** CALLBACKS: 
    - input: company number
    - jurisdiction: the company jurisdiction code (EW, SC, NI)
    - output: prompt to enter company no + jurisdiction, or error message (if any)
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

var NodeOutcome = {
    TRUE: "true",
    FALSE: "false"
}

//extracts the company number (if present) from the query parameters
function fetchCompanyParameters() {
    var companyNo = requestParameters.get("companyNo");
    var jurisdiction = requestParameters.get("jurisdiction");
    if (companyNo && jurisdiction) {
        logger.error("[EWF PROMPT COMPANY NO] company number/jurisdiction found in request: " + companyNo.get(0) + " - " + jurisdiction.get(0));
        return {
            companyNo: companyNo.get(0),
            jurisdiction: jurisdiction.get(0)
        }
    }
    logger.error("[EWF PROMPT COMPANY NO] Company number or jurisdiction not found in request");
    return false;
}

try {

    if (typeof existingSession !== 'undefined') {
        logger.error("[EWF PROMPT COMPANY NO] existing session: " + existingSession.toString());
    }
    else {
        logger.error("[EWF PROMPT COMPANY NO] no session!");
    }

    var companyParamsResponse = fetchCompanyParameters();

    if (!companyParamsResponse) {
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
                    new fr.HiddenValueCallback("stage", "EWF_LOGIN_2"),
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
                    new fr.HiddenValueCallback("stage", "EWF_LOGIN_2")
                ).build();
            }
        } else {
            var jurisdictionIndex = callbacks.get(1).getSelectedIndexes()[0];
            logger.error("[EWF PROMPT COMPANY NO] jurisdiction: " + jurisdictions[jurisdictionIndex]);

            var companyNumber = callbacks.get(2).getName();
            logger.error("[EWF PROMPT COMPANY NO] companyNumber: " + companyNumber);

            sharedState.put("companyNumber", companyNumber);
            sharedState.put("jurisdiction", jurisdictions[jurisdictionIndex]);
            action = fr.Action.goTo(NodeOutcome.TRUE)
                .putSessionProperty("companyNumber", companyNumber)
                .putSessionProperty("jurisdiction", jurisdictions[jurisdictionIndex])
                .build();
        }
    } else {
        logger.error("[EWF PROMPT COMPANY NO] companyNumber (from query params): " + companyParamsResponse.companyNo + " - " + companyParamsResponse.jurisdiction );
        sharedState.put("companyNumber", companyParamsResponse.companyNo);
        sharedState.put("jurisdiction", companyParamsResponse.jurisdiction);
        sharedState.put("skipConfirmation", true);
        action = fr.Action.goTo(NodeOutcome.TRUE)
            .putSessionProperty("companyNumber", companyParamsResponse.companyNo)
            .putSessionProperty("jurisdiction", companyParamsResponse.jurisdiction)
            .build();
    }
} catch (e) {
    logger.error("[EWF PROMPT COMPANY NO] ERROR: " + e);
    sharedState.put("errorMessage", e.toString());
    action = fr.Action.goTo(NodeOutcome.FALSE).build();
}