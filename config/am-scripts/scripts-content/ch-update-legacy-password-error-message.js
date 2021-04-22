logger.error("[UPDATE LEGACY PASSWORD] Enter a correct username and password.");

sharedState.put("errorMessage", "Enter a correct username and password.")
sharedState.put("pagePropsJSON", JSON.stringify(
    {
        'errors': [{
            label: "Enter a correct username and password.",
            token: "LEGACY_PASSWORD_ERROR",
            fieldName: "IDToken2",
            anchor: "IDToken2"
        }]
    }));

outcome = "true";