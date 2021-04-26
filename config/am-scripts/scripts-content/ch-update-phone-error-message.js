logger.error("[UPDATE PHONE NUMBER ERROR MESSAGE] Enter correct password.");

sharedState.put("errorMessage", "Enter the correct password.")
sharedState.put("pagePropsJSON", JSON.stringify(
    {
        'errors': [{
            label: "Enter the correct password.",
            token: "USER_PASSWORD_INCORRECT",
            fieldName: "IDToken1",
            anchor: "IDToken1"
        }]
    }));

outcome = "true";