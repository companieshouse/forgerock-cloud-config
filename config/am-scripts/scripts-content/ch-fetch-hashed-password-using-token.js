var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action
)

var ACCESS_TOKEN_STATE_FIELD = "idmAccessToken";

var fetchUserSecretString = "{\"endpoint\": \"https://openam-companieshouse-uk-dev.id.forgerock.io/openidm/managed/alpha_user/\"}";

function fetchSecret() {
    try {
        return JSON.parse(fetchUserSecretString);
    } catch (e) {
        logger.error("[FETCH HASHED PASSWORD WITH TOKEN] Error while parsing secret: " + e);
        return false;
    }
}

var NodeOutcome = {
    TRUE: "true",
    FALSE: "false"
}

function logResponse(response) {
    logger.error("[FETCH HASHED PASSWORD WITH TOKEN] Scripted Node HTTP Response: " + response.getStatus() + ", Body: " + response.getEntity().getString());
}

function fetchUserHashedPassword(userName) {
    if (userName == null) {
        logger.error("[FETCH HASHED PASSWORD WITH TOKEN] No user name in shared state");
        return NodeOutcome.FALSE;
    }

    var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);
    if (accessToken == null) {
      logger.error("[FETCH HASHED PASSWORD WITH TOKEN] Access token not in shared state")
      return NodeOutcome.FALSE;
    }

    var fetchUser = fetchSecret();
    if (!fetchUser) {
        logger.error("[FETCH HASHED PASSWORD WITH TOKEN] Service info is invalid");
        return NodeOutcome.FALSE;
    }

    var request = new org.forgerock.http.protocol.Request();
    request.setMethod('GET');
    var searchTerm = "?_queryFilter=userName+eq+%22" + userName + "%22";
    request.setUri(fetchUser.endpoint + searchTerm);
    request.getHeaders().add("Authorization", "Bearer " + accessToken);
    request.getHeaders().add("Content-Type", "application/json");

    var response = httpClient.send(request).get();

    logResponse(response);

    if (response.getStatus().getCode() === 200) {
        logger.error("[FETCH HASHED PASSWORD WITH TOKEN] 200 response from IDM");
        var userResponse = JSON.parse(response.getEntity().getString());

        if (userResponse.resultCount == 1) {
            logger.error("[FETCH HASHED PASSWORD WITH TOKEN] Got a result");

            var hashedPassword = userResponse.result[0].frIndexedString2;
            if (hashedPassword == null) {
                logger.error("[FETCH HASHED PASSWORD WITH TOKEN] No hashed password associated with user")
                return NodeOutcome.FALSE;
            }
            
            logger.error("[FETCH HASHED PASSWORD WITH TOKEN] Found hashedPassword: " + hashedPassword);
            sharedState.put("hashedCredential", hashedPassword);

            var userId = userResponse.result[0]._id;
            logger.error("[FETCH HASHED PASSWORD WITH TOKEN] Found userId: " + userId);
            sharedState.put("userId", userId);

            return NodeOutcome.TRUE;
        } else {
            logger.error("[FETCH HASHED PASSWORD WITH TOKEN] No user results")
            return NodeOutcome.FALSE;
        }
    } else if (response.getStatus().getCode() === 401) {
        logger.error("[FETCH HASHED PASSWORD WITH TOKEN] Authentication failed for user fetch");
        return NodeOutcome.FALSE;
    }

}

var password = transientState.get("password");
sharedState.put("credential", password);

var debug = String("Shared state: " + sharedState.toString() + "\\n");
var debug2 = String("Transient state: " + transientState.toString() + "\\n");
logger.error("[FETCH HASHED PASSWORD WITH TOKEN] " + debug + debug2);

var userName = sharedState.get("username");

outcome = fetchUserHashedPassword(userName);