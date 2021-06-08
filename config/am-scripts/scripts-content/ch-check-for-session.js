/* 
  ** OUTCOMES
    - hasSession: the user has an active session
    - noSession: the user does not have an active session
  
  ** CALLBACKS: 
    - error: no active session found
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

try{
  if (typeof existingSession !== 'undefined') {
    outcome = NodeOutcome.HAS_SESSION;
    logger.error("[CHECK SESSION] existing session: "+existingSession.toString());
  }
  else {
    if (callbacks.isEmpty()) {
      action = fr.Action.send(
        new fr.HiddenValueCallback(
          "stage",
          "NO_SESSION_ERROR"
        ),
        new fr.TextOutputCallback(
          fr.TextOutputCallback.ERROR,
          "You must have an active session to proceed with this operation"
        ),
        new fr.HiddenValueCallback(
          "pagePropsJSON",
          JSON.stringify({ 'errors': [{ label: "You must have an active session to proceed with this operation", token: "NO_ACTIVE_SESSION" }] })
        )
      ).build()
    }
    outcome = NodeOutcome.NO_SESSION;
  }
}catch(e){
  logger.error("[CHECK SESSION] error: "+e);
}
