var _scriptName = 'CH CONSENT - PROCESS REQUEST';

var NodeOutcome = {
    SUCCESS: "success",
    NO_CONSENT: "noconsent",
    ERROR: "error"
}

var fr = JavaImporter(
    org.forgerock.json.jose.builders.JwtBuilderFactory,
    org.forgerock.json.jose.jwt.JwtClaimsSet,
    org.forgerock.json.jose.jws.SignedJwt,
    java.lang.String
)

var consentRequest = requestParameters.get("consent_request").get(0)

if (!consentRequest) {
    _log("[PROCESS REQUEST CONSENT] No consent request in request")
    outcome = NodeOutcome.NO_CONSENT
} else {
    _log("[PROCESS REQUEST CONSENT] Got consent request " + consentRequest, 'MESSAGE')
    _log("[PROCESS REQUEST CONSENT] Extracting payload")

    var jwt = new fr.JwtBuilderFactory().reconstruct(consentRequest,fr.SignedJwt);
    var claims = jwt.getClaimsSet().toJsonValue()

    _log("[PROCESS REQUEST CONSENT] Claims " + claims, 'MESSAGE')
    sharedState.put("consentRequest", claims, 'MESSAGE')

    outcome = NodeOutcome.SUCCESS;
}

// LIBRARY START
// LIBRARY END