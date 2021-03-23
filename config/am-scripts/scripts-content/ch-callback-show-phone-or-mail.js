var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback
)
var phoneNumber = "";
var emailAddress = "";
var notificationId = transientState.get("notificationId");
var mfaRoute = transientState.get("mfa-route");
var otpError = transientState.get("error");
logger.error("[LOGIN MFA] Found OTP Error : " + otpError);

try{
  var userId = sharedState.get("_id");

  if (mfaRoute == "sms") {
    if (idRepository.getAttribute(userId, "telephoneNumber").iterator().hasNext()) {
        phoneNumber = idRepository.getAttribute(userId, "telephoneNumber").iterator().next();
        logger.error("[LOGIN MFA] phoneNumber : " + phoneNumber);
    } else {
        logger.error("[LOGIN MFA] Couldn't find telephoneNumber");
        // TODO Better handling of error
    }
  } else if (mfaRoute == "email") {
    if (idRepository.getAttribute(userId, "mail").iterator().hasNext()) {
        emailAddress = idRepository.getAttribute(userId, "mail").iterator().next();
        logger.error("[LOGIN MFA] emailAddress : " + emailAddress);
    } else {
        logger.error("[LOGIN MFA] Couldn't find emailAddress");
        // TODO Better handling of error
    }
  } else {
    logger.error("[LOGIN MFA] Couldn't determine route used for sending MFA code");
  }
} catch(e) {
  logger.error("[LOGIN MFA] Error retrieving user details: " + e);
}

if (otpError) {
    if (callbacks.isEmpty()) {
        action = fr.Action.send(
            new fr.HiddenValueCallback (
                "pagePropsJSON",
                JSON.stringify({ 'errors': [{ label: otpError, anchor: "IDToken3" }], "phoneNumber": phoneNumber, "emailAddress": emailAddress })
            ),
            new fr.TextOutputCallback(
                fr.TextOutputCallback.ERROR,
                otpError
            )
        ).build()    
    }
} else if (callbacks.isEmpty()) {
    action = fr.Action.send(
        new fr.HiddenValueCallback (
            "pagePropsJSON",
            JSON.stringify({"phoneNumber": phoneNumber, "email": emailAddress})
        ),
        new fr.HiddenValueCallback (
            "notificationId",
            notificationId
        )
    ).build()
} else {
    outcome = "True";
}