var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.TextOutputCallback,
    javax.security.auth.callback.PasswordCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback,
    com.sun.identity.authentication.callbacks.ScriptTextOutputCallback,
    javax.security.auth.callback.ConfirmationCallback,
    java.lang.String
);

var scriptName = "[SJD CHOOSE OTP]";

var phoneNumber = "";
var emailAddress = "";

function log (message) {
    logger.error(scriptName + " " + message);
}

log("Starting request of OTP Method");

try {
    var userId = sharedState.get("_id");

    log("UserId : " + userId);

    if (idRepository.getAttribute(userId, "telephoneNumber").iterator().hasNext()) {
        phoneNumber = idRepository.getAttribute(userId, "telephoneNumber").iterator().next();
        log("phoneNumber : " + phoneNumber);
    } else {
        log("Couldn't find telephoneNumber");
    }

    if (idRepository.getAttribute(userId, "mail").iterator().hasNext()) {
        emailAddress = idRepository.getAttribute(userId, "mail").iterator().next();
        log("emailAddress : " + emailAddress);
    } else {
        log("Couldn't find emailAddress");
    }
} catch (e) {
    log("Error retrieving user details: " + e);
}

var userDetailsJSON = JSON.stringify({ "phoneNumber": phoneNumber, "emailAddress": emailAddress });
log("User Details JSON : " + userDetailsJSON);

if (callbacks.isEmpty()) {
    action = fr.Action.send(
        new fr.HiddenValueCallback(
            "pagePropsJSON",
            userDetailsJSON
        ),
        new fr.TextOutputCallback(
            fr.TextOutputCallback.INFORMATION,
            "Select how you want the OTP sent"
        ),
        new fr.ConfirmationCallback(
            "Select how you want the OTP sent",
            fr.ConfirmationCallback.INFORMATION,
            ["EMAIL", "TEXT"],
            1),
        new fr.HiddenValueCallback("stage", "EWF_LOGIN_OTP_METHOD")
    ).build();
} else {
    var otpMethod = callbacks.get(2).getSelectedIndex();

    log("OTP Method Requested : " + otpMethod);

    if (otpMethod === 0) {
        outcome = "email";
    } else {
        outcome = "text";
    }

    log("Outcome = " + outcome);
}