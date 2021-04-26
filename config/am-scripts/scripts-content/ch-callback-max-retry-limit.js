var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback
  )
  
  if (callbacks.isEmpty()) {
    action = fr.Action.send(
      new fr.TextOutputCallback(
          fr.TextOutputCallback.ERROR,
          "Exceeded number of attempts - please try again later." 
      ),
      new fr.HiddenValueCallback (
          "stage",
          "LIMIT_EXCEEDED_ERROR" 
      ),
      new fr.HiddenValueCallback (
          "pagePropsJSON",
          JSON.stringify({"errors": [{"label": "Exceeded number of attempts - please try again later.", "token": "MAX_ATTEMPTS_EXCEEDED"}]})
      )
    ).build()
  } else { 
   outcome = "false";
  }