var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback
  )
  
  if (callbacks.isEmpty()) {
    action = fr.Action.send(
      new fr.TextOutputCallback(
            fr.TextOutputCallback.INFORMATION,
            "The password has been updated successfully. Please login"
        ),
        new fr.HiddenValueCallback (
            "stage",
            "RESET_PASSWORD_5" 
        )
    ).build()
  } else {
    outcome = "true";
  }