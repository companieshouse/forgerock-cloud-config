logger.error("[UPDATE LEGACY PASSWORD] The username / password provided are invalid.");

sharedState.put("errorMessage", "Enter a correct username and password.");
sharedState.put("pagePropsJSON", JSON.stringify(
    {
        'errors': [{
            label: "Enter a correct username and password.",
            token: "PASSWORD_CHECK_ERROR",
            fieldName: "IDToken2",
            anchor: "IDToken2"
        }]
    }));

outcome = "true";