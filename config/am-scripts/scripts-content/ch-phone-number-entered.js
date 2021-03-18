var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action
)

var phone = sharedState.get("objectAttributes").get("telephoneNumber");
if (phone) {
  transientState.put("phoneNumber", phone);
  outcome = "true";
} else {
  outcome = "false";
}