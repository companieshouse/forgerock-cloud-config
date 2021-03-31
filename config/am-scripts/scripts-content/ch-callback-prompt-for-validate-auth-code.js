var fr = JavaImporter(
   org.forgerock.openam.auth.node.api.Action,
   javax.security.auth.callback.NameCallback
)

if (callbacks.isEmpty()) {
  action = fr.Action.send(
    new fr.NameCallback("Enter Auth Code"),
    new fr.NameCallback("Enter Company number")
  ).build();
} else {
  var credential = callbacks.get(0).getName();
  var companyNumber = callbacks.get(1).getName();
  
  logger.error("[VALIDATE AUTH CODE CALLBACK] credential: " + credential);
  logger.error("[VALIDATE AUTH CODE CALLBACK] companyNumber: " + companyNumber);

  sharedState.put("credential", credential);
  sharedState.put("companyNumber", companyNumber);
  action = fr.Action.goTo("true").build();
}