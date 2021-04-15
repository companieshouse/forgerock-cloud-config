var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback
  )
  
  var email = sharedState.get("objectAttributes").get("mail");
  var notificationId = transientState.get("notificationId");

  if (callbacks.isEmpty()) {
    action = fr.Action.send(
      new fr.TextOutputCallback(
          fr.TextOutputCallback.INFORMATION,
          "Please check your email to complete registration - "+email 
      ),
      new fr.HiddenValueCallback (
          "stage",
          "REGISTRATION_3" 
      ),
      new fr.HiddenValueCallback (
          "pagePropsJSON",
          JSON.stringify({"email": email}) 
      ),
      new fr.HiddenValueCallback (
          "notificationId",
          notificationId 
      )
    ).build();
  } else {
    outcome = "true";
  }