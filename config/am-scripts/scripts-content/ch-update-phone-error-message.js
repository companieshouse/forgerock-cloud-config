logger.error("[UPDATE PHONE NUMBER ERROR MESSAGE] Enter correct password.");

sharedState.put("errorMessage", "Enter the correct password.")
sharedState.put("pagePropsJSON", JSON.stringify(
    {
        'errors': [{
            label: "Enter the correct password.",
            token: "USER_PASSWORD_INCORRECT",
            fieldName: "IDToken3",
            anchor: "IDToken3"
        }]
    }));

outcome = "true";