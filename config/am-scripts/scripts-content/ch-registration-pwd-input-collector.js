var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.PasswordCallback,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback,
    java.lang.String
)

var NodeOutcome = {
    SUCCESS: "success",
    MISMATCH: "mismatch"
}

try {
    if (callbacks.isEmpty()) {
        var infoMessage = "Please enter your new password (and confirmation)";
        var level = fr.TextOutputCallback.INFORMATION;
        var errorMessage = sharedState.get("errorMessage");
        if (errorMessage !== null) {
            var errorProps = sharedState.get("pagePropsJSON");
            level = fr.TextOutputCallback.ERROR;
            infoMessage = errorMessage.concat(" Please try again.");
            action = fr.Action.send(
                fr.TextOutputCallback(level, infoMessage),
                fr.PasswordCallback("New password", false),
                fr.PasswordCallback("Confirm new password", false),
                fr.HiddenValueCallback("stage", "REGISTRATION_4"),
                fr.HiddenValueCallback("pagePropsJSON", errorProps)
            ).build();
        } else {
            action = fr.Action.send(
                fr.TextOutputCallback(level, infoMessage),
                fr.PasswordCallback("New password", false),
                fr.PasswordCallback("Confirm new password", false),
                fr.HiddenValueCallback("stage", "REGISTRATION_4")
            ).build();
        }
    } else {
        var newPassword = fr.String(callbacks.get(1).getPassword());
        var confirmNewPassword = fr.String(callbacks.get(2).getPassword());
        if (!confirmNewPassword.equals(newPassword)) {
            sharedState.put("errorMessage", "The new password and confirmation do not match.");
            sharedState.put("pagePropsJSON", JSON.stringify(
                {
                    'errors': [{
                        label: "The new password and confirmation do not match.",
                        token: "PWD_MISMATCH",
                        fieldName: "IDToken2",
                        anchor: "IDToken2"
                    }]
                }));
            action = fr.Action.goTo(NodeOutcome.MISMATCH).build();
        }
        else {
            transientState.put("newPassword", newPassword);
            action = fr.Action.goTo(NodeOutcome.SUCCESS).build();
        }
    }

} catch (e) {
    logger.error("[PWD INPUT COLLECTOR] ERROR: " + e);
    action = fr.Action.send(
        fr.TextOutputCallback(fr.TextOutputCallback.INFORMATION, e)
    ).build();
}