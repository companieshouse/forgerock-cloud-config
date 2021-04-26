var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action
)

var PHONE_NUMBER_FIELD = "telephoneNumber";

var userId = sharedState.get("_id");
if (idRepository.getAttribute(userId, PHONE_NUMBER_FIELD).iterator().hasNext()) {
  var phoneNumber = idRepository.getAttribute(userId, PHONE_NUMBER_FIELD).iterator().next();
  logger.error("Found telephoneNumber: " + phoneNumber);
  outcome = "true";
} else {
  logger.error("Couldn't find telephoneNumber");
  outcome = "false";
}
