var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback
)

if (callbacks.isEmpty()) {
  action = fr.Action.send(
    new fr.TextOutputCallback(
      fr.TextOutputCallback.ERROR,
      "Registration failed - A user with this email already exists!" 
    )
  ).build()
} else { 
 outcome = "false";
}