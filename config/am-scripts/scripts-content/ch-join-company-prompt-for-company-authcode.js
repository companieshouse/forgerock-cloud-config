/* 
  ** OUTPUT DATA
    * SHARED STATE:
      - 'credential' : the company auth code entered by the user
       
  ** OUTCOMES
    - true: input collected
  
  ** CALLBACKS: 
    - input: company auth code
*/

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.NameCallback,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
)



if (callbacks.isEmpty()) {
   var infoMessage = "Please enter the company auth code."
   var errorMessage = sharedState.get("errorMessage")
   var level = fr.TextOutputCallback.INFORMATION
   if (errorMessage != null) {
     level = fr.TextOutputCallback.ERROR
     infoMessage = errorMessage.concat(" Please try again.")
   }
   action = fr.Action.send(
    new fr.TextOutputCallback(level, infoMessage), 
    new fr.NameCallback("Enter Auth Code"),
    new fr.HiddenValueCallback ("stage", "COMPANY_ASSOCIATION_3"),
    new fr.HiddenValueCallback("pagePropsJSON", JSON.stringify({ 'errors': [{ label: infoMessage }] }))
 ).build();
} else {
  var credential = callbacks.get(1).getName();
  
  logger.error("[ENTER AUTH CODE CALLBACK] cleartext auth code: " + credential);

  sharedState.put("credential", credential);
  action = fr.Action.goTo("true").build();
}