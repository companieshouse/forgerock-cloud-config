var _scriptName = "SJD CHOOSE OTP";

var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.TextOutputCallback,
    javax.security.auth.callback.PasswordCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback,
    com.sun.identity.authentication.callbacks.ScriptTextOutputCallback,
    javax.security.auth.callback.ConfirmationCallback,
    java.lang.String
);

var phoneNumber = "";
var emailAddress = "";

_log("Starting request of OTP Method");

try {
    var userId = sharedState.get("_id");

    _log("UserId : " + userId);

    if (idRepository.getAttribute(userId, "telephoneNumber").iterator().hasNext()) {
        phoneNumber = idRepository.getAttribute(userId, "telephoneNumber").iterator().next();
        _log("phoneNumber : " + phoneNumber);
    } else {
        _log("Couldn't find telephoneNumber");
    }

    if (idRepository.getAttribute(userId, "mail").iterator().hasNext()) {
        emailAddress = idRepository.getAttribute(userId, "mail").iterator().next();
        _log("emailAddress : " + emailAddress);
    } else {
        _log("Couldn't find emailAddress");
    }
} catch (e) {
    _log("Error retrieving user details: " + e);
}

var userDetailsJSON = JSON.stringify({ "phoneNumber": phoneNumber, "emailAddress": emailAddress });
_log("User Details JSON : " + userDetailsJSON);

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

    _log("OTP Method Requested : " + otpMethod);

    if (otpMethod === 0) {
        outcome = "email";
    } else {
        outcome = "text";
    }

    _log("Outcome = " + outcome);
}

// LIBRARY START
// LIBRARY END