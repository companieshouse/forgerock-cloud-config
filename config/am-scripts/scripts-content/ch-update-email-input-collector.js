var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.PasswordCallback,
    javax.security.auth.callback.TextOutputCallback,
    javax.security.auth.callback.NameCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback,
    java.lang.String
)

var NodeOutcome = {
    SUCCESS: "success",
    EMAIL_INVALID_ERROR: "email_invalid",
    MISMATCH: "mismatch"
}

function validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

function raiseError(message, token) {
    action = fr.Action.send(
        new fr.HiddenValueCallback(
            "stage",
            "CHANGE_EMAIL_ERROR"
        ),
        new fr.HiddenValueCallback(
            "pagePropsJSON",
            JSON.stringify({ "error": message, "token": token })
        ),
        new fr.TextOutputCallback(
            fr.TextOutputCallback.ERROR,
            message
        )
    ).build()
}

// main execution flow
try {
    var sessionOwnerId = sharedState.get("_id");

    if (callbacks.isEmpty()) {
        var infoMessage = "Please enter your current password, together with your new email (and confirmation)";
        var level = fr.TextOutputCallback.INFORMATION;
        var errorMessage = sharedState.get("errorMessage");
        if (errorMessage !== null) {
            var errorProps = sharedState.get("pagePropsJSON");
            level = fr.TextOutputCallback.ERROR;
            infoMessage = errorMessage.concat(" Please try again.");
            action = fr.Action.send(
                fr.TextOutputCallback(level, infoMessage),
                fr.PasswordCallback("Current password", false),
                fr.NameCallback("New email address"),
                fr.NameCallback("Confirm new email"),
                fr.HiddenValueCallback("stage", "CHANGE_EMAIL_1"),
                fr.HiddenValueCallback("pagePropsJSON", errorProps)
            ).build();
        } else {
            action = fr.Action.send(
                fr.TextOutputCallback(level, infoMessage),
                fr.PasswordCallback("Current password", false),
                fr.NameCallback("New email address"),
                fr.NameCallback("Confirm new email"),
                fr.HiddenValueCallback("stage", "CHANGE_EMAIL_1")
            ).build();
        }
    } else {
        var password = fr.String(callbacks.get(1).getPassword());
        var newEmail = fr.String(callbacks.get(2).getName());
        var confirmNewEmail = fr.String(callbacks.get(3).getName());

        if (!validateEmail(newEmail)) {
            logger.error("[CHANGE EMAIL INPUT] Invalid email: " + newEmail);
            sharedState.put("errorMessage", "Invalid email address.");
            sharedState.put("pagePropsJSON", JSON.stringify(
                {
                    'errors': [{
                        label: "Invalid email address.",
                        token: "CHANGE_EMAIL_INVALID_EMAIL_ERROR",
                        fieldName: "IDToken3",
                        anchor: "IDToken3"
                    }]
                }));
            action = fr.Action.goTo(NodeOutcome.EMAIL_INVALID_ERROR).build();
        } else {
            if (!newEmail.equals(confirmNewEmail)) {
                sharedState.put("errorMessage", "The new email and confirmation do not match.");
                sharedState.put("pagePropsJSON", JSON.stringify(
                    {
                        'errors': [{
                            label: "The new email and confirmation do not match.",
                            token: "EMAIL_MISMATCH",
                            fieldName: "IDToken3",
                            anchor: "IDToken3"
                        }]
                    }));
                action = fr.Action.goTo(NodeOutcome.MISMATCH).build();
            }
            else {
                transientState.put("password", password);
                sharedState.put("isChangeEmail", true);
                sharedState.put("newEmail", newEmail);
                action = fr.Action.goTo(NodeOutcome.SUCCESS).build();
            }
        }
    }
} catch (e) {
    logger.error("[CHANGE EMAIL INPUT] error: " + e);
    sharedState.put("errorMessage", e.toString())
    action = fr.Action.goTo(NodeOutcome.ERROR).build();
}