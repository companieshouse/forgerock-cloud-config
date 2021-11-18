var _scriptName = "INVITE USER CONFIRM EMAIL SEND";
_log("Started");

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
    SEND: "send"
}

var ConfirmIndex = {
    SEND: 0,
    CHANGE_EMAIL: 1
}

// main execution flow
var email = sharedState.get("email");
try {
    if (callbacks.isEmpty()) {

        action = fr.Action.send(
            new fr.TextOutputCallback(fr.TextOutputCallback.INFORMATION, "Check the authorised person's email address before we send the email to ".concat(email)),
            new fr.ConfirmationCallback(
                "Check the authorised person's email address before we send the email",
                fr.ConfirmationCallback.INFORMATION,
                ["SEND", "CHANGE_EMAIL"],
                0),
            new fr.HiddenValueCallback("stage", "INVITE_USER_CONFIRM"),
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
        _log("confirm resend choice: " + confirmIndex);

        if (confirmIndex === ConfirmIndex.SEND) {
            action = fr.Action.goTo(NodeOutcome.SEND).build();
        } else {
            action = fr.Action.goTo(NodeOutcome.CHANGE_EMAIL).build();
        }
    }
} catch (e) {
    _log("ERROR " + e);
    action = fr.Action.send(
        new fr.TextOutputCallback(
            fr.TextOutputCallback.ERROR,
            e.toString()
        )
    ).build()
}

//_log("Outcome = " + outcome);

// LIBRARY START
// LIBRARY END