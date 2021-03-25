var fr = JavaImporter(
   org.forgerock.openam.auth.node.api.Action,
   javax.security.auth.callback.NameCallback
)

if (callbacks.isEmpty()) {
  action = fr.Action.send(
    new fr.NameCallback("Enter Credential")
  ).build();
} else {
  logger.error("Credential: " + callbacks.get(0).getName());
  sharedState.put("credential", callbacks.get(0).getName());
  sharedState.put("hashedCredential", "$2a$10$uS7dsFz8iIuNvXQK6dG1v.F//uQajFz0BLc60/B8qrGqsdFrU77MO");
  action = fr.Action.goTo("true").build();
}