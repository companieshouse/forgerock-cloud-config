var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action
)

var ACCESS_TOKEN_STATE_FIELD = "idmAccessToken";

var updateUserSecretString = "{\"endpoint\": \"https://openam-companieshouse-uk-dev.id.forgerock.io/openidm/managed/alpha_user/\"}";

function fetchSecret() {
    try {
        return JSON.parse(updateUserSecretString);
    } catch (e) {
        logger.error("[UPDATE LEGACY PASSWORD] Error while parsing secret: " + e);
        return false;
    }
}

var NodeOutcome = {
    TRUE: "true",
    FALSE: "false",
    INVALID: "invalid"
}

function logResponse(response) {
    logger.error("[UPDATE LEGACY PASSWORD] Scripted Node HTTP Response: " + response.getStatus() + ", Body: " + response.getEntity().getString());
}

function updateUserPassword(userId, password) {
    if (userId == null) {
        logger.error("[UPDATE LEGACY PASSWORD] No user name in shared state");
        return NodeOutcome.FALSE;
    }

    var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);
    if (accessToken == null) {
      logger.error("[UPDATE LEGACY PASSWORD] Access token not in shared state")
      return NodeOutcome.FALSE;
    }

    var updateUser = fetchSecret();
    if (!updateUser) {
        logger.error("[UPDATE LEGACY PASSWORD] Service info is invalid");
        return NodeOutcome.FALSE;
    }

    var request = new org.forgerock.http.protocol.Request();
    request.setMethod('PATCH');
    request.setUri(updateUser.endpoint + userId);
    request.getHeaders().add("Authorization", "Bearer " + accessToken);
    request.getHeaders().add("Content-Type", "application/json");
    var requestBodyJson = [
        {
            "operation": "replace",
            "field": "/password",
            "value": password
        },
        {
            "operation": "replace",
            "field": "/frIndexedString3",
            "value": "migrated"
        },
    ];
    request.setEntity(requestBodyJson);

    var response = httpClient.send(request).get();

    logResponse(response);

    if (response.getStatus().getCode() === 200) {
        logger.error("[UPDATE LEGACY PASSWORD] 200 response from IDM");
        transientState.put("password", password);
        return NodeOutcome.TRUE;
    } else if (response.getStatus().getCode() === 401) {
        logger.error("[UPDATE LEGACY PASSWORD] Authentication failed");
        return NodeOutcome.FALSE;
    } else if (response.getStatus().getCode() === 403) {
        var userResponse = JSON.parse(response.getEntity().getString());
        var message = userResponse.message;
        logger.error("[UPDATE LEGACY PASSWORD] Forbidden: " + message);
        return NodeOutcome.INVALID;
    }
}

var userId = sharedState.get("_id");
var password = transientState.get("newPassword");

logger.error("[UPDATE LEGACY PASSWORD] Setting user password for user " + userId);

outcome = updateUserPassword(userId, password);