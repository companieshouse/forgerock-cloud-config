var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action, 
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback
)

var NodeOutcome = {
    SUCCESS: "true"
}

var infoMessage = "Your phone number has been changed successfully"

if (callbacks.isEmpty()) { 
    
    action = fr.Action.send(
        new fr.TextOutputCallback(
            fr.TextOutputCallback.INFORMATION, 
            infoMessage
        ),
        new fr.HiddenValueCallback (
            "stage",
            "UPDATE_PHONE_3"
        )
    ).build()
} 
else {
    action = fr.Action.goTo(NodeOutcome.SUCCESS).build()         
}