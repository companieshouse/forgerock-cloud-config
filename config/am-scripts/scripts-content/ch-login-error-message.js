var username = sharedState.get("username");
var password = transientState.get("password");

logger.error("[LOGIN] Enter correct credentials.");

if (username && password) {
    sharedState.put("errorMessage", "Enter a correct username and password.")
    sharedState.put("pagePropsJSON", JSON.stringify(
        {
            'errors': [{
                label: "Enter a correct username and password.",
                token: "USER_CREDENTIALS_INCORRECT",
                fieldName: "IDToken2",
                anchor: "IDToken2"
            }]
        }));
} else {
    sharedState.put("errorMessage", "Enter a username and password.")
    sharedState.put("pagePropsJSON", JSON.stringify(
        {
            'errors': [{
                label: "Enter a username and password.",
                token: "USER_CREDENTIALS_INCOMPLETE",
                fieldName: "IDToken1",
                anchor: "IDToken1"
            }]
        }));
}

outcome = "true";