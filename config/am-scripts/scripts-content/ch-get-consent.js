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
        _log("[GET CONSENT] No consent request in shared state", 'MESSAGE')
        return null
    }

    var clientName = consentRequest.get("client_name")
    var infoMessage = "Allow ".concat(clientName).concat(" to do the following:")
    var consentCallbacks = []

    var scopes = consentRequest.get("scopes")
    var scopesObj = [];
    _log("[GET CONSENT] Got scopes " + scopes, 'MESSAGE')
    scopes.keySet().toArray().forEach(function (key) {
        var value = scopes.get(key)
        scopesObj.push(key+"");
        _log("[GET CONSENT] scope " + key + ": " + value, 'MESSAGE')
        if (value == null) {
            value = key
        }
    })
  
    var claims = consentRequest.get("claims")

    var claimsObj = {};
    claims.keySet().toArray().forEach(function (key) {
        var value = claims.get(key)
        claimsObj[key]=value+"";
    })

    _log("[GET CONSENT] Got claims " + claims, 'MESSAGE')

    if (claims != null && claims.get("userinfo") != null) {
        var userinfo = claims.get("userinfo")
        userinfo.keySet().toArray().forEach(function (key) {
            var value = userinfo.get(key)
            _log("[GET CONSENT] userinfo " + key + ": " + value)
        })
    }

    var confirmOptions = ["Yes","No"]
    var company = claims.get("id_token").get("company").get("value")+"";
    var pagePropsJSON = {"company":company, "scopes":scopesObj }
    consentCallbacks.push(new fr.HiddenValueCallback('pagePropsJSON', JSON.stringify(pagePropsJSON) ));
    consentCallbacks.push(new fr.HiddenValueCallback('stage', 'GET_CONSENT'));
    consentCallbacks.push(new fr.ConfirmationCallback(fr.ConfirmationCallback.INFORMATION, confirmOptions, 1));

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
    _log("[GET CONSENT] Decision index " + decisionIndex, 'MESSAGE')
    var consentDecision = (decisionIndex == 0)
    sharedState.put("consentDecision",consentDecision)
    action = fr.Action.goTo(NodeOutcome.SUCCESS).build()
}

// LIBRARY START
// LIBRARY END