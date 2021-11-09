var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    java.lang.Math,
    org.forgerock.openam.auth.node.api,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback,
    javax.security.auth.callback.ConfirmationCallback
)

var NodeOutcome = {
    ERROR: "error",
    CHANGE_EMAIL: "change_email",
    RESEND: "resend"
}

var ConfirmIndex = {
    RESEND: 0,
    CHANGE_EMAIL: 1
}

//raises a generic registration error
function sendErrorCallbacks(stage, token, message) {
    if (callbacks.isEmpty()) {
        action = fr.Action.send(
            new fr.HiddenValueCallback(
                "stage",
                stage
            ),
            new fr.TextOutputCallback(
                fr.TextOutputCallback.ERROR,
                message
            ),
            new fr.HiddenValueCallback(
                "pagePropsJSON",
                JSON.stringify({ 'errors': [{ label: message, token: token }] })
            )
        ).build()
    }
}

// main execution flow
var email = sharedState.get("objectAttributes").get("mail");
try {
    if (callbacks.isEmpty()) {

        action = fr.Action.send(
            new fr.TextOutputCallback(fr.TextOutputCallback.INFORMATION, "Do you want to resend to ".concat(email).concat("?")),
            new fr.ConfirmationCallback(
                "Do you want to resend?",
                fr.ConfirmationCallback.INFORMATION,
                ["RESEND", "CHANGE_EMAIL"],
                0),
            new fr.HiddenValueCallback("stage", "REGISTRATION_RESEND"),
            new fr.HiddenValueCallback(
                "pagePropsJSON",
                JSON.stringify(
                    {
                        "emailAddress": email
                    }
                )
            )
        ).build();
    } else {
        var confirmIndex = callbacks.get(1).getSelectedIndex();
        logger.error("[UPDATE EMAIL CONSENT] confirm remove: " + confirmIndex);

        if (confirmIndex === ConfirmIndex.RESEND) {
            sharedState.put("resendEmail", true);
            action = fr.Action.goTo(NodeOutcome.RESEND).build();

        } else {
            sharedState.put("resendEmail", false);
            action = fr.Action.goTo(NodeOutcome.CHANGE_EMAIL).build();
        }
    }
} catch (e) {
    logger.error("[REGISTRATION - RESEND EMAIL] ERROR " + e);
    action = fr.Action.send(
        new fr.TextOutputCallback(
            fr.TextOutputCallback.ERROR,
            e.toString()
        )
    ).build()
}