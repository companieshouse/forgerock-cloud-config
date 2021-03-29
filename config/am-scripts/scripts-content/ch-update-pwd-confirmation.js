var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action, 
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback
)

var infoMessage = "Your password has been changed successfully"

if (callbacks.isEmpty()) { 
    
    action = fr.Action.send(
        new fr.TextOutputCallback(
            fr.TextOutputCallback.INFORMATION, 
            infoMessage
        ),
        new fr.HiddenValueCallback (
            "stage",
            "CHANGE_PASSWORD_2" 
        )
    ).build()
} 
else {
    action = fr.Action.goTo("true").build()         
}