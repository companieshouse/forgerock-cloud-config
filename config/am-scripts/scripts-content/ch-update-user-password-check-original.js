var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action
)

var NodeOutcome = {
    MATCH: "match",
    MISMATCH: "mismatch",
}

function checkUserPassword(userEnteredPassword, passwordFromCollector) {

    logger.error("[UPDATE USER PASSWORD CHECK ORIGINAL] Comparing " + userEnteredPassword + " with " + passwordFromCollector);
    if (!userEnteredPassword.equals(passwordFromCollector)) {
        sharedState.put("errorMessage","The current password you supplied is incorrect.")
        logger.error("[UPDATE USER PASSWORD CHECK ORIGINAL] The current password you supplied is correct")
        return NodeOutcome.MISMATCH;
    }
    return NodeOutcome.MATCH;
}

var userEnteredPassword = sharedState.get("credential");
var passwordFromCollector = transientState.get("password");

outcome = checkUserPassword(userEnteredPassword, passwordFromCollector);