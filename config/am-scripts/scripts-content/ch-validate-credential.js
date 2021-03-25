var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback
)

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

try {
    var requestBodyJson = {
        "password": credential,
        "hash": hash
    }
} catch (e) {
    logger.error("[VALIDATE CREDENTIAL] Error while preparing request: " + e);
}

var validateServiceInfo = fetchSecret();
if (!validateServiceInfo) {
    logger.error("[VALIDATE CREDENTIAL] validateServiceInfo is invalid");
}

var request = new org.forgerock.http.protocol.Request();
request.setUri(validateServiceInfo.endpoint);
request.setMethod("POST");
request.getHeaders().add("Content-Type", "application/json");
request.getHeaders().add("x-api-key", validateServiceInfo.apiKey);
request.getEntity().setString(JSON.stringify(requestBodyJson))
var response = httpClient.send(request).get();
logResponse(response);

if (response.getStatus().getCode() == 200) {
    var validationResponse = JSON.parse(response.getEntity().getString());
    logger.error("[VALIDATE CREDENTIAL] validationResponse: " + validationResponse);

    if (validationResponse == "true") {
       logger.error("[VALIDATE CREDENTIAL] Credential VALID");
        outcome = "true";
    } else if (validationResponse == "false") {
        logger.error("[VALIDATE CREDENTIAL] Credential INVALID");
        outcome = "false";
    }

    if (callbacks.isEmpty()) {
        action = fr.Action.send(
            new fr.TextOutputCallback(
                fr.TextOutputCallback.INFORMATION,
                "Valid: " + validationResponse
            ),
            new fr.HiddenValueCallback(
                "stage",
                "VALIDATE_CREDENTIAL_2"
            ),
            new fr.HiddenValueCallback(
                "pagePropsJSON",
                JSON.stringify({ "foo": "bar" })
            ),
            new fr.HiddenValueCallback(
                "test1",
                "test2"
            )
        ).build()
    }
} else {
    if (callbacks.isEmpty()) {
        action = fr.Action.send(
            new fr.HiddenValueCallback(
                "stage",
                "VALIDATE_CREDENTIAL_ERROR"
            ),
            new fr.TextOutputCallback(
                fr.TextOutputCallback.ERROR,
                "The credential could not be validated: " + response.getEntity().getString()
            ),
            new fr.HiddenValueCallback(
                "pagePropsJSON",
                JSON.stringify({ 'errors': [{ label: "An error occurred while validating the credential. Please try again." }] })
            )
        ).build()
    }
    outcome = "false";
}
