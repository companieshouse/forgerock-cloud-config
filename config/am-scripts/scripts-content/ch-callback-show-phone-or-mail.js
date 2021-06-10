var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback
)
var phoneNumber = "";
var emailAddress = "";
var notificationId = transientState.get("notificationId");
var mfaRoute = sharedState.get("mfa-route");
var otpError = transientState.get("error");
logger.error("[LOGIN MFA CALLBACK] Found OTP Error : " + otpError);

try {
    var userId = sharedState.get("_id");

    if (mfaRoute == "sms") {
        if (idRepository.getAttribute(userId, "telephoneNumber").iterator().hasNext()) {
            phoneNumber = idRepository.getAttribute(userId, "telephoneNumber").iterator().next();
            logger.error("[LOGIN MFA CALLBACK] phoneNumber : " + phoneNumber);
        } else {
            logger.error("[LOGIN MFA CALLBACK] Couldn't find telephoneNumber");
            // TODO Better handling of error
        }
    } else if (mfaRoute == "email") {
        if (idRepository.getAttribute(userId, "mail").iterator().hasNext()) {
            emailAddress = idRepository.getAttribute(userId, "mail").iterator().next();
            logger.error("[LOGIN MFA CALLBACK] emailAddress : " + emailAddress);
        } else {
            logger.error("[LOGIN MFA CALLBACK] Couldn't find emailAddress");
            // TODO Better handling of error
        }
    } else {
        logger.error("[LOGIN MFA CALLBACK] Couldn't determine route used for sending MFA code");
    }
} catch (e) {
    logger.error("[LOGIN MFA CALLBACK] Error retrieving user details: " + e);
}

if (otpError) {
    if (callbacks.isEmpty()) {
        action = fr.Action.send(
            new fr.HiddenValueCallback(
                "pagePropsJSON",
                JSON.stringify(
                    {
                        'errors': [
                            {
                                label: otpError,
                                token: "OTP_NOT_VALID",
                                fieldName: "IDToken1",
                                anchor: "IDToken1"
                            }
                        ],
                        "phoneNumber": phoneNumber,
                        "emailAddress": emailAddress,
                        "type": mfaRoute
                    }
                )
            ),
            new fr.TextOutputCallback(
                fr.TextOutputCallback.ERROR,
                otpError
            )
        ).build()
    }
} else if (callbacks.isEmpty()) {
    var message = "";
    if (mfaRoute == "sms") {
        message = "Please check your phone";
    } else if (mfaRoute == "email") {
        message = "Please check your email";
    }

    action = fr.Action.send(
        new fr.HiddenValueCallback(
            "pagePropsJSON",
            JSON.stringify({ "phoneNumber": phoneNumber, "emailAddress": emailAddress, "type": mfaRoute })
        ),
        new fr.TextOutputCallback(
            fr.TextOutputCallback.INFORMATION,
            message
        ),
        new fr.HiddenValueCallback(
            "notificationId",
            notificationId
        )
    ).build()
} else {
    outcome = "True";
}