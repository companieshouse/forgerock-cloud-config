var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.TextOutputCallback
)

var NodeOutcome = {
    TRUE: "true",
    FALSE: "false"
}

var validateServiceSecretString = "{\"endpoint\": \"https://btazausqwf.execute-api.eu-west-2.amazonaws.com/cidev/\",\"apiKey\": \"kIEW1gAYcT5DGoCVZ8wDT1Rq1aw6IX242qPDiSHA\"}";

function fetchSecret() {
    try {
        return JSON.parse(validateServiceSecretString);
    } catch (e) {
        logger.error("[VALIDATE CREDENTIAL] Error while parsing secret: " + e);
        return false;
    }
}

function logResponse(response) {
    logger.error("[VALIDATE CREDENTIAL] HTTP Response: " + response.getStatus() + ", Body: " + response.getEntity().getString());
}


var credential = sharedState.get("credential");
var hash = sharedState.get("hashedCredential");
logger.error("[VALIDATE CREDENTIAL] credential: " + credential);
logger.error("[VALIDATE CREDENTIAL] hashedCredential: " + hash);

var validateServiceInfo = fetchSecret();
if (!validateServiceInfo) {
    logger.error("[VALIDATE CREDENTIAL] validateServiceInfo is invalid");
    outcome = NodeOutcome.FALSE;
}

var request = new org.forgerock.http.protocol.Request();
request.setUri(validateServiceInfo.endpoint);
request.setMethod("POST");
request.getHeaders().add("Content-Type", "application/json");
request.getHeaders().add("x-api-key", validateServiceInfo.apiKey);

var requestBodyJson = {
    "password": credential,
    "hash": hash
}
request.getEntity().setString(JSON.stringify(requestBodyJson));

var response = httpClient.send(request).get();
logResponse(response);

if (response.getStatus().getCode() == 200) {
    var validationResponse = JSON.parse(response.getEntity().getString());
    logger.error("[VALIDATE CREDENTIAL] validationResponse: " + validationResponse);

    if (validationResponse == "true") {
        logger.error("[VALIDATE CREDENTIAL] Credential VALID");
        outcome = NodeOutcome.TRUE;
    } else if (validationResponse == "false") {
        logger.error("[VALIDATE CREDENTIAL] Credential INVALID");
        outcome = NodeOutcome.FALSE;
    }
} else {
    logger.error("[VALIDATE CREDENTIAL] Invalid response returned: " + response.getStatus().getCode());
    outcome = NodeOutcome.FALSE;
}
