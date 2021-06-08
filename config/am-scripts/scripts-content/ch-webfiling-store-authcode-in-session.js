/* 
  ** OUTPUT DATA:
    * SESSION:
      - 'authCode' : the plaintext company auth code entered by the user 
       
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

action = fr.Action.goTo("true")
    .putSessionProperty("authCode", sharedState.get("credential"))
    .build()
