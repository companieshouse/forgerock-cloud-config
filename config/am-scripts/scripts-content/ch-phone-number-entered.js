var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action
)

var phone = sharedState.get("objectAttributes").get("telephoneNumber");
if (phone) {
  transientState.put("registrationMFA", true);
  outcome = "true";
} else {
  outcome = "false";
}