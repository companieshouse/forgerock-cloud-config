/* 
  ** OUTPUT DATA:
    * SESSION:
      - 'authCode' : the plaintext password entered by the user 
       
  ** OUTCOMES
    - true: session updated
*/

var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action
)

if (typeof existingSession !== 'undefined') {
    logger.error("[EWF SESSION STORE] existing session: " + existingSession.toString());
}
else {
    logger.error("[EWF SESSION STORE] no session!");
}

sharedState.put("errorMessage", null);
sharedState.put("pagePropsJSON", null);
var password = transientState.get("password") ? transientState.get("password") : sharedState.get("password");

logger.error("[EWF SESSION STORE] storing password in session: " + password);

action = fr.Action.goTo("true")
    .putSessionProperty("password", password)
    .build()
