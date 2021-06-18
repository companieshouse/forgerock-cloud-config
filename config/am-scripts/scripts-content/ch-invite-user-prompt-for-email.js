/* 
  ** INPUT DATA

    * SHARED STATE:
      - companyNumber: the company number to invite users for
      - '_id' : the id of the user who is invoking the journey (owner of the current session)
      - [optional] 'errorMessage': error message to display from previous attempts
      - [optional] 'pagePropsJSON': error message to display from previous attempts
 
  ** OUTPUT DATA
   
    * SHARED STATE:
      - 'email': email of the invited user

  ** OUTCOMES
    - success: input collected
    - email_invalid: the email address provided has an invalid format
    - error: an error occurred
  
*/

var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.NameCallback,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback
)

var NodeOutcome = {
    SUCCESS: "success",
    EMAIL_INVALID_ERROR: "email_invalid",
    ERROR: "error"
}

function validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

// main execution flow
try {
    var companyData = sharedState.get("companyData");
    logger.error("[INVITE USER INPUT] company data: " + companyData);
    var companyName = JSON.parse(companyData).name;

    if (callbacks.isEmpty()) {
        var infoMessage = "What are the details of the person you want to authorise to file for this company?";
        var errorMessage = sharedState.get("errorMessage");
        var level = fr.TextOutputCallback.INFORMATION;
        if (errorMessage !== null) {
            var errorProps = sharedState.get("pagePropsJSON");
            level = fr.TextOutputCallback.ERROR;
            infoMessage = errorMessage.concat(" Please try again.");
            action = fr.Action.send(
                new fr.TextOutputCallback(level, infoMessage),
                new fr.NameCallback("Email Address"),
                new fr.HiddenValueCallback("stage", "INVITE_USER_1"),
                new fr.HiddenValueCallback("pagePropsJSON", errorProps)
            ).build();
        } else {
            action = fr.Action.send(
                new fr.TextOutputCallback(level, infoMessage),
                new fr.NameCallback("Email Address"),
                new fr.HiddenValueCallback("stage", "INVITE_USER_1")
            ).build();
        }
    } else {
        var email = callbacks.get(1).getName();
        var userId = sharedState.get("_id");
        if (!validateEmail(email)) {
            logger.error("[INVITE USER INPUT] Invalid email: " + email);
            action = fr.Action.goTo(NodeOutcome.EMAIL_INVALID_ERROR).build();
        } else {
            logger.error("[INVITE USER INPUT] company number: " + JSON.parse(companyData).number);
            logger.error("[INVITE USER INPUT] invited email: " + email);
            logger.error("[INVITE USER INPUT] inviter ID: " + userId);

            sharedState.put("email", email);
            action = fr.Action.goTo(NodeOutcome.SUCCESS).build();
        }
    }
} catch (e) {
    logger.error("[INVITE USER INPUT] error: " + e);
    action = fr.Action.goTo(NodeOutcome.ERROR).build();
}