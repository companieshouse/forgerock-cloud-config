/* 
  ** INPUT DATA
    * SHARED STATE:
    - 'credential' : the plaintext credential entered by the user 
    - 'hashedCredential' : the hashed credentials to compare against
   
  ** OUTCOMES
    - true: comparison successful
    - false: comparison failed, or error
*/

var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.TextOutputCallback
)

var NodeOutcome = {
    TRUE: "true",
    FALSE: "false",
    ERROR: "error"
}

var validateServiceSecretString = "{\"endpoint\": \"https://btazausqwf.execute-api.eu-west-2.amazonaws.com/cidev/\",\"apiKey\": \"kIEW1gAYcT5DGoCVZ8wDT1Rq1aw6IX242qPDiSHA\"}";

//fetches the secret as a JSON object
function fetchSecret() {
    try {
        return JSON.parse(validateServiceSecretString);
    } catch (e) {
        logger.error("[VALIDATE CREDENTIAL] Error while parsing secret: " + e);
        return false;
    }
}

// perform the credentials comparison against an external service
function validateCredential(credential, hash){
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
        "hash": hash,
        "method": "CHS"
    }
    request.getEntity().setString(JSON.stringify(requestBodyJson));
    
    var response = httpClient.send(request).get();
    logger.error("[VALIDATE CREDENTIAL] HTTP Response: " + response.getStatus() + ", Body: " + response.getEntity().getString());
    
    if (response.getStatus().getCode() == 200) {
        var validationResponse = JSON.parse(response.getEntity().getString());
        logger.error("[VALIDATE CREDENTIAL] validationResponse: " + validationResponse);
        if(validationResponse.errorMessage){
            logger.error("[VALIDATE CREDENTIAL] cannot parse hash: " + hash);
            return NodeOutcome.FALSE; //TOD return error outcome and handle it in tree
        }

        if (validationResponse == "true") {
            logger.error("[VALIDATE CREDENTIAL] Credential VALID");
            return NodeOutcome.TRUE;
        } else if (validationResponse == "false") {
            logger.error("[VALIDATE CREDENTIAL] Credential INVALID");
            return NodeOutcome.FALSE;
        }
    } else {
        logger.error("[VALIDATE CREDENTIAL] Invalid response returned: " + response.getStatus().getCode());
        return NodeOutcome.FALSE;
    }
}

// main execution flow
var credential = sharedState.get("credential");
var hash = sharedState.get("hashedCredential");
logger.error("[VALIDATE CREDENTIAL] credential: " + credential);
logger.error("[VALIDATE CREDENTIAL] hashedCredential: " + hash);

outcome = validateCredential(credential, hash);