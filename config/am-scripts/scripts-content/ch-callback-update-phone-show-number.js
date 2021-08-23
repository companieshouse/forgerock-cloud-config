var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback
)

var phoneNumber = sharedState.get("objectAttributes").get("telephoneNumber");
logger.error("[UPDATE PHONE SHOW NUMBER] Phone number: " + phoneNumber);

var notificationId = transientState.get("notificationId");
var otpError = transientState.get("error");
logger.error("[UPDATE PHONE SHOW NUMBER] Found OTP Error: " + otpError);

try {
    if (otpError) {
        if (callbacks.isEmpty()) {
            action = fr.Action.send(
                new fr.HiddenValueCallback (
                    "pagePropsJSON",
                    JSON.stringify(
                        { 'errors': [{
                            label: otpError,
                            token: "OTP_NOT_VALID_SMS",
                            fieldName: "IDToken3",
                            anchor: "IDToken3" 
                        }],
                          "phoneNumber": phoneNumber
                        })
                ),
                new fr.TextOutputCallback(
                    fr.TextOutputCallback.ERROR,
                    otpError
                )
            ).build()
        }
    } else if (callbacks.isEmpty()) {
        var message = "Please check your phone";

        action = fr.Action.send(
            new fr.HiddenValueCallback (
                "pagePropsJSON",
                JSON.stringify({"phoneNumber": phoneNumber})
            ),
            new fr.TextOutputCallback(
                fr.TextOutputCallback.INFORMATION,
                message
            ),
            new fr.HiddenValueCallback (
                "notificationId",
                notificationId
            )
        ).build()
    } else {
        outcome = "True";
    }
} catch(e) {
    logger.error("[UPDATE PHONE SHOW NUMBER] An error occurred: " + e);
    sharedState.put("errorMessage", e.toString())
    outcome = "False";
}