var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback
)
var phoneNumber = "";
var notificationId = transientState.get("notificationId");

try{
  var userId = sharedState.get("_id");
  if (idRepository.getAttribute(userId, "telephoneNumber").iterator().hasNext()) {
    phoneNumber = idRepository.getAttribute(userId, "telephoneNumber").iterator().next();
  } else {
    logger.error("Couldn't find telephoneNumber");
    // TODO Better handling of error
  }
}catch(e){
  logger.error("[RESET PWD] Error retrieving telephoneNumber: "+ e);
}

logger.error("[RESET PWD] phoneNumber : " + phoneNumber);

if (callbacks.isEmpty()) {
    action = fr.Action.send(
        new fr.HiddenValueCallback (
            "pagePropsJSON",
            JSON.stringify({"phoneNumber": phoneNumber}) 
        ),
        new fr.HiddenValueCallback (
            "notificationId",
            notificationId
        )
    ).build()
} else {
    outcome = "True";
}