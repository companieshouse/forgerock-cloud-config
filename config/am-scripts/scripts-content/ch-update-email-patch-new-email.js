var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.PasswordCallback,
    javax.security.auth.callback.TextOutputCallback,
    javax.security.auth.callback.NameCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback,
    java.lang.String
)

var NodeOutcome = {
    SUCCESS: "success",
    ERROR: "error"
}

function updateUsername(userId, value) {
    var accessToken = transientState.get("idmAccessToken");
    if (accessToken == null) {
        logger.error("[CHANGE EMAIL PATCH] Access token not in shared state")
        return {
            success: false,
            message: "Access token not in transient state"
        }
    }
    logger.error("[CHANGE EMAIL PATCH] Updating counter to " + value);

    var request = new org.forgerock.http.protocol.Request();
    request.setMethod('PATCH');
    request.setUri(alphaUserUrl + userId);
    request.getHeaders().add("Authorization", "Bearer " + accessToken);
    request.getHeaders().add("Content-Type", "application/json");
    var requestBodyJson = [
        {
            "operation": "replace",
            "field": "/userName",
            "value": value
        }
    ];
    request.setEntity(requestBodyJson);

    var response = httpClient.send(request).get();

    if (response.getStatus().getCode() === 200) {
        logger.error("[CHANGE EMAIL PATCH] Counter updated correctly");
        return true;
    } else {
        logger.error("[CHANGE EMAIL PATCH] Error while updating counter value: " + response.getStatus().getCode());
        return false;
    }
}

try {
    var alphaUserUrl = "https://openam-companieshouse-uk-dev.id.forgerock.io/openidm/managed/alpha_user/";
    var newEmail = sharedState.get("newEmail");
    var sessionOwnerId = sharedState.get("_id");
    var result = updateUsername(sessionOwnerId, newEmail);
    if (!result) {
        sharedState.put("errorMessage", "Could not update the user");
        sharedState.put("pagePropsJSON", JSON.stringify(
          {
            'errors': [{
              label: "Could not update the user",
              token: "CHANGE_EMAIL_ERROR",
              fieldName: "IDToken2",
              anchor: "IDToken2"
            }]
          }));
        outcome = NodeOutcome.ERROR;
      } else {
        outcome = NodeOutcome.SUCCESS;
      }
} catch (e) {
    logger.error("[CHANGE EMAIL PATCH] error " + e);
    sharedState.put("errorMessage", e.toString());
    outcome = NodeOutcome.ERROR;
}