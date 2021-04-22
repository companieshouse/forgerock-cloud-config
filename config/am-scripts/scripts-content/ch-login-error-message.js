var username = sharedState.get("username");
var password = transientState.get("password");

if (username && password) {
    sharedState.put("errorMessage","Enter a correct username and password.")
    sharedState.put("loginErrorType", "USER_CREDENTIALS_INCORRECT");
} else {
    sharedState.put("errorMessage","Enter a username and password.")
    sharedState.put("loginErrorType", "USER_CREDENTIALS_INCOMPLETE");
}
sharedState.put("loginErrorField", "IDToken2");

logger.error("[LOGIN] Enter a correct username and password.");

outcome = "true";