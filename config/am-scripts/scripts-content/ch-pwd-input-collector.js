var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.PasswordCallback,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback,
    java.lang.String
)

var NodeOutcome = {
    SUCCESS: "success",
    ERROR: "error"
}

function raiseErrorCallback(level, stage, userName, companyName, infoMessage, errorProps){
    var newJSONProps = JSON.parse(errorProps);    
    newJSONProps.company = {
        name: companyName
    }
    newJSONProps.user = {
        userName: userName
    }
    action = fr.Action.send(
        fr.TextOutputCallback(level, infoMessage),
        fr.PasswordCallback("New password", false),
        fr.PasswordCallback("Confirm new password", false),
        fr.HiddenValueCallback("stage", stage),
        fr.HiddenValueCallback("pagePropsJSON", JSON.stringify(newJSONProps))
    ).build();
}

try {
    var userName = sharedState.get("userName");
    // journey selector variables
    var isOnboarding = sharedState.get("isOnboarding");
    var isResetPassword = sharedState.get("isResetPassword");
    var isRegistration = sharedState.get("isRegistration");
    
    var invitedCompanyName = sharedState.get("invitedCompanyName");
    var stageName = isOnboarding ? "ONBOARDING_PWD" : (isResetPassword ? "RESET_PASSWORD_4" : (isRegistration ? "REGISTRATION_4" : "N/A"));

    if (callbacks.isEmpty()) {
        var infoMessage = "Please create new password for user ".concat(sharedState.get("userName"));
        var level = fr.TextOutputCallback.INFORMATION;
        var errorMessage = sharedState.get("errorMessage");
        if (errorMessage !== null) {
            var errorProps = sharedState.get("pagePropsJSON");
            level = fr.TextOutputCallback.ERROR;
            infoMessage = errorMessage.concat(" Please try again.");
            raiseErrorCallback(level, stageName, userName, invitedCompanyName, infoMessage, errorProps);
        } else {
            action = fr.Action.send(
                fr.TextOutputCallback(level, infoMessage),
                fr.PasswordCallback("New password", false),
                fr.PasswordCallback("Confirm new password", false),
                fr.HiddenValueCallback("stage", stageName),
                fr.HiddenValueCallback("pagePropsJSON",
                    JSON.stringify(
                        {
                            "company": {
                                name: invitedCompanyName
                            },
                            "user": {
                                userName: userName
                            }
                        }
                    )
                )
            ).build();
        }
    } else {
        var newPassword = fr.String(callbacks.get(1).getPassword());
        var confirmNewPassword = fr.String(callbacks.get(2).getPassword());
        if (!confirmNewPassword.equals(newPassword)) {
            var infoMessage = "The new password and confirmation do not match.";
            var errorProps = JSON.stringify(
                {
                    'errors': [{
                        label: infoMessage,
                        token: "PWD_MISMATCH",
                        fieldName: "IDToken3",
                        anchor: "IDToken3"
                    }]
                });
                raiseErrorCallback(fr.TextOutputCallback.ERROR, stageName, userName, invitedCompanyName, infoMessage, errorProps);
        }
        else {
            transientState.put("newPassword", newPassword);
            action = fr.Action.goTo(NodeOutcome.SUCCESS).build();
        }
    }
} catch (e) {
    logger.error("[PWD INPUT COLLECTOR] ERROR: " + e);
    var errorMessage = sharedState.put("errorMessage", e);
    action = fr.Action.goTo(NodeOutcome.ERROR).build();
}