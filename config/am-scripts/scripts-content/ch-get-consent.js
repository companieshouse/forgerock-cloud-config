var _scriptName = 'CH CONSENT - GET CONSENT';

var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action, 
    javax.security.auth.callback.TextOutputCallback,
    javax.security.auth.callback.ConfirmationCallback,
    org.forgerock.json.JsonValue,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback
)

var NodeOutcome = {
    SUCCESS: "success",
    ERROR: "error"
}

function raiseError(message) {
    action = fr.Action.send(
        new fr.TextOutputCallback(
            fr.TextOutputCallback.ERROR,
            message
        )
    ).build()
}

function getConsentCallbacks() {
    var consentRequest = sharedState.get("consentRequest")

    if (consentRequest == null) {
        _log("[GET CONSENT] No consent request in shared state")
        return null
    }

    var clientName = consentRequest.get("client_name")
    var infoMessage = "Allow ".concat(clientName).concat(" to do the following:")
    var consentCallbacks = [
        new fr.TextOutputCallback(fr.TextOutputCallback.INFORMATION,infoMessage)
    ]

    var scopes = consentRequest.get("scopes")
    _log("[GET CONSENT] Got scopes " + scopes)
    scopes.keySet().toArray().forEach(function (key) {
        var value = scopes.get(key)
        _log("[GET CONSENT] scope " + key + ": " + value)
        if (value == null) {
            value = key
        }
        consentCallbacks.push(new fr.TextOutputCallback(fr.TextOutputCallback.INFORMATION,("- ").concat(value)))
    })
  
    var claims = consentRequest.get("claims")
    var claimsObj = {};
    claims.keySet().toArray().forEach(function (key) {
        var value = scopes.get(key)
        claimsObj[key]=value+"";
    })

    _log("[GET CONSENT] Got claims " + claims)
    if (claims != null && claims.get("userinfo") != null) {
        consentCallbacks.push(new fr.TextOutputCallback(fr.TextOutputCallback.INFORMATION,"Info"))
        var userinfo = claims.get("userinfo")
        userinfo.keySet().toArray().forEach(function (key) {
            var value = userinfo.get(key)
            _log("[GET CONSENT] userinfo " + key + ": " + value)
            consentCallbacks.push(new fr.TextOutputCallback(fr.TextOutputCallback.INFORMATION,("- ").concat(key).concat(": ").concat(value.get("value"))))
        })
    }
  
    var confirmOptions = ["Yes","No"]
    consentCallbacks.push(new fr.ConfirmationCallback(fr.ConfirmationCallback.INFORMATION, confirmOptions, 1));
    consentCallbacks.push(new fr.HiddenValueCallback('pagePropsJSON', JSON.stringify(claimsObj) ));
    return consentCallbacks
}

if (callbacks.isEmpty()) {
    var consentCallbacks = getConsentCallbacks()
    if (consentCallbacks == null) {
        //raiseError("Failed here")
        outcome = NodeOutcome.ERROR
  } else {
      action = fr.Action.send.apply(
        null,
        consentCallbacks
      ).build()
  }
} else {
    var decisionIndex = callbacks.get(callbacks.size() - 1).getSelectedIndex()
    _log("[GET CONSENT] Decision index " + decisionIndex)
    var consentDecision = (decisionIndex == 0)
    sharedState.put("consentDecision",consentDecision)
    action = fr.Action.goTo(NodeOutcome.SUCCESS).build()
}

// LIBRARY START
// LIBRARY END