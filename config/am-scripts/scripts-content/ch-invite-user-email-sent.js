var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
)

var companyData = sharedState.get("companyData");
var inviterUserId = sharedState.get("_id");
var invitedEmail = sharedState.get("email");
var inviterName = sharedState.get("inviterName");
var invitedName = sharedState.get("invitedName");
var notificationId = transientState.get("notificationId");


if (callbacks.isEmpty()) {
  action = fr.Action.send(
    new fr.TextOutputCallback(
      fr.TextOutputCallback.INFORMATION,
      "An email request has been sent to " + invitedName + " to be authorised to file online for " + JSON.parse(companyData).name + "."
    ),
    new fr.HiddenValueCallback(
      "stage",
      "INVITE_USER_2"
    ),
    new fr.HiddenValueCallback(
      "pagePropsJSON",
      JSON.stringify({ "invitedUser": invitedName, "company": { name: JSON.parse(companyData).name } })
    ),
    new fr.HiddenValueCallback(
      "notificationId",
      notificationId
    )
  ).build()
} else {
  outcome = "true";
}

