/*
  ** OUTCOMES
    - true: Will take user on to enter a new (complex) password
  ** CALLBACKS
    - info: User password has failed complexity policy validation and needs to be updated
*/

var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback
  )
  
  if (callbacks.isEmpty()) {
    action = fr.Action.send(
      new fr.TextOutputCallback(
            fr.TextOutputCallback.INFORMATION,
            "Your password needs to be updated. Please follow the instructions"
        ),
        new fr.HiddenValueCallback (
            "stage",
            "CH_LOGIN_4" 
        )
    ).build()
  } else {
    outcome = "true";
  }