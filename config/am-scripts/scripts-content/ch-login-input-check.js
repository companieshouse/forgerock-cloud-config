var username = sharedState.get("username");
var password = transientState.get("password");

// validates email format
function validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

var NodeOutcome = {
    TRUE: "true",
    FALSE: "false"
}

try{
    var errorMessage = "";
    //both credentials are supplied
    if (username && password) { 
        // email has wrong format
        if (!validateEmail(username)) {
            errorMessage = errorMessage.concat("Invalid email format: ").concat(username);
            logger.error("[LOGIN] invalid email format");
            sharedState.put("errorMessage", errorMessage);
            sharedState.put("pagePropsJSON", JSON.stringify(
                {
                    'errors': [{
                        label: errorMessage,
                        token: "EMAIL_FORMAT_ERROR",
                        fieldName: "IDToken1",
                        anchor: "IDToken1"
                    }]
                }));
            outcome = NodeOutcome.FALSE;
        } else {
            outcome = NodeOutcome.TRUE;
        }        
    } else if (!username || !password) {

        logger.error("[LOGIN] username or pwd missing");

        sharedState.put("errorMessage", "Username or password missing.")
        sharedState.put("pagePropsJSON", JSON.stringify(
            {
                'errors': [{
                    label: "Username or password missing.",
                    token: "USER_CREDENTIALS_INCOMPLETE",
                    fieldName: "IDToken1",
                    anchor: "IDToken1"
                }]
            }));
        outcome = NodeOutcome.FALSE;
    } else {
        outcome = NodeOutcome.TRUE;
    }

}catch(e){
    logger.error("error: "+e);
    sharedState.put("errorMessage", e.toString());
}