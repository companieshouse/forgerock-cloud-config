var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
)

if (callbacks.isEmpty()) {
  action = fr.Action.send(
    new fr.TextOutputCallback(
        fr.TextOutputCallback.ERROR,
        "Registration failed - A user with this email already exists!" 
    ),
    new fr.HiddenValueCallback (
        "stage",
        "REGISTRATION_ERROR" 
    ),
    new fr.HiddenValueCallback (
        "pagePropsJSON",
        JSON.stringify({"errors": [{"label": "A user with this email already exists!"}]})
    )
  ).build()
} else { 
 outcome = "false";
}