var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action
)

var NodeOutcome = {
  HAS_SESSION: "hasSession",
  NO_SESSION: "noSession"
}

if (typeof existingSession !== 'undefined')
{
  outcome = NodeOutcome.HAS_SESSION;
}
else
{
  sharedState.put("errorMessage", "You must have an active session to change your password")
  action = fr.Action.goTo(NodeOutcome.NO_SESSION).build()
}