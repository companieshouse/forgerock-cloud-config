/* 
  ** OUTCOMES
    - hasSession: the user has an active session
    - noSession: the user does not have an active session
*/

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
)

var NodeOutcome = {
  HAS_SESSION: "hasSession",
  NO_SESSION: "noSession"
}

sharedState.put("EWF-JOURNEY", true);

if (typeof existingSession !== 'undefined') {
  outcome = NodeOutcome.HAS_SESSION;
  logger.error("[EWF CHECK SESSION] existing session: "+existingSession.toString());
}
else {
  logger.error("[EWF CHECK SESSION] no session");
  outcome = NodeOutcome.NO_SESSION;
}