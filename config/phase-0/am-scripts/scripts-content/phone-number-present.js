var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action
)

var userId = sharedState.get("_id");
if (idRepository.getAttribute(userId, "telephoneNumber").iterator().hasNext()) {
  var phoneNumber = idRepository.getAttribute(userId, "telephoneNumber").iterator().next();
  logger.error("Found telephoneNumber: " + phoneNumber);
  outcome = "true";
} else {
  logger.error("Couldn't find telephoneNumber");
  outcome = "false";
}
