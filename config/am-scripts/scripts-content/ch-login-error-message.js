logger.error("[LOGIN] Cannot find a user with this email.");
sharedState.put("errorMessage", "Cannot find a user with this email.")
sharedState.put("pagePropsJSON", JSON.stringify(
    {
        'errors': [{
            label: "Cannot find a user with this email.",
            token: "USER_EMAIL_NOT_FOUND",
            fieldName: "IDToken2",
            anchor: "IDToken2"
        }]
    }));

outcome = "true";