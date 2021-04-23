sharedState.put("errorMessage","The current password you supplied is incorrect.");
sharedState.put("pagePropsJSON", JSON.stringify(
    {
        'errors': [{
            label: "The current password you supplied is incorrect.",
            token: "PWD_INCORRECT",
            fieldName: "IDToken2",
            anchor: "IDToken2"
        }]
    }));
logger.error("[CHANGE PWD - DATA STORE DECISION FAIL] The current password you supplied is incorrect");
outcome = "true";