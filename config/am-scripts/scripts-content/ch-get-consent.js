var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action, 
    javax.security.auth.callback.TextOutputCallback,
    javax.security.auth.callback.ConfirmationCallback,
    org.forgerock.json.JsonValue
)

var NodeOutcome = {
  SUCCESS: "success",
  ERROR: "error"
}

function getConsentCallbacks() {
  var consentRequest = sharedState.get("consentRequest")

  if (consentRequest == null) {
    logger.error("No consent request in shared state")
    return null
  }
  var clientName = consentRequest.get("client_name")
  var infoMessage = "Allow ".concat(clientName).concat(" to do the following:")
  var consentCallbacks = [
    new fr.TextOutputCallback(fr.TextOutputCallback.INFORMATION,infoMessage)        
  ]

  var scopes = consentRequest.get("scopes")
  logger.message("Got scopes " + scopes)
  scopes.keySet().toArray().forEach(function (key) {
    var value = scopes.get(key)
    logger.message("scope " + key + ": " + value)
    if (value == null) {
      value = key
    }
    consentCallbacks.push(new fr.TextOutputCallback(fr.TextOutputCallback.INFORMATION,("- ").concat(value)))
  })
  
  var claims = consentRequest.get("claims")
  logger.message("Got claims " + claims)
  if (claims != null && claims.get("userinfo") != null) {
    consentCallbacks.push(new fr.TextOutputCallback(fr.TextOutputCallback.INFORMATION,"Info")) 
    var userinfo = claims.get("userinfo")
    userinfo.keySet().toArray().forEach(function (key) {
      var value = userinfo.get(key)
      logger.message("userinfo " + key + ": " + value)
      consentCallbacks.push(new fr.TextOutputCallback(fr.TextOutputCallback.INFORMATION,("- ").concat(key).concat(": ").concat(value.get("value"))))
    })
  }
  
  var confirmOptions = ["Yes","No"]
  consentCallbacks.push(new fr.ConfirmationCallback(fr.ConfirmationCallback.INFORMATION,
                confirmOptions, 1));
  
  return consentCallbacks
}
  

if (callbacks.isEmpty()) { 
  var consentCallbacks = getConsentCallbacks()
  if (consentCallbacks == null) {
      outcome = NodeOutcome.ERROR                  
  }
  else {
    action = fr.Action.send.apply(
      null,
      consentCallbacks
    ).build()
  }
} 
else {
  var decisionIndex = callbacks.get(callbacks.size() - 1).getSelectedIndex()
  logger.message("Decision index " + decisionIndex)
  var consentDecision = (decisionIndex == 0)
  sharedState.put("consentDecision",consentDecision)
  action = fr.Action.goTo(NodeOutcome.SUCCESS).build()         
}