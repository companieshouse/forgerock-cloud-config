/* 
  ** INPUT DATA
    * SHARED STATE:
      - '_id"': the user ID which has been looked up in a previous step

    * TRANSIENT STATE
      - 'idmAccessToken': the IDM access token

  ** OUTPUT DATA
    * SHARED STATE:
      - 'errorMessage': the 'account locked' message, or the 'generic error' message
      - 'pagePropsJSON': the JSON props for the UI to consume via callbacks
    
  ** OUTCOMES
    - success: the user soft lock date and counter have been successfully reset
    - error: error while resetting user soft lock status
*/

var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback,
    java.lang.Integer
)

var ACCESS_TOKEN_STATE_FIELD = "idmAccessToken";
var alphaUserUrl = "https://openam-companieshouse-uk-dev.id.forgerock.io/openidm/managed/alpha_user/";

var NodeOutcome = {
    SUCCESS: "success",
    ERROR: "error"
}

function logResponse(response) {
    logger.error("[RESET SOFT LOCK COUNTER] Scripted Node HTTP Response: " + response.getStatus() + ", Body: " + response.getEntity().getString());
}

// unlocks the provided user by setting frIndexedString4 (date of soft lock) to null and frUnindexedInteger1 (counter) to 0
function resetSoftLockCounter(userId, accessToken) {

    var request = new org.forgerock.http.protocol.Request();
    request.setMethod('PATCH');
    request.setUri(alphaUserUrl + userId);
    request.getHeaders().add("Authorization", "Bearer " + accessToken);
    request.getHeaders().add("Content-Type", "application/json");
    var convertedZero = fr.Integer.valueOf(0);
    var requestBodyJson = [
        {
            "operation": "remove",
            "field": "/frIndexedString4"
        },
        {
            "operation": "replace",
            "field": "/frUnindexedInteger1",
            "value": convertedZero
        }
    ];
    request.setEntity(requestBodyJson);

    var response = httpClient.send(request).get();

    logResponse(response);

    if (response.getStatus().getCode() === 200) {
        logger.error("[RESET SOFT LOCK COUNTER] User unlocked correctly");
        return true;
    } else {
        logger.error("[RESET SOFT LOCK COUNTER] Error while unlocking user: " + response.getStatus().getCode());
        return false;
    }
}

// main execution flow
try{
    var userId = sharedState.get("_id");

    if (userId == null) {
        logger.error("[RESET SOFT LOCK COUNTER] No user name in shared state");
        action = fr.Action.goTo(NodeOutcome.ERROR).build();
    }

    var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);
    if (accessToken == null) {
        logger.error("[RESET SOFT LOCK COUNTER] Access token not in transient state")
        action = fr.Action.goTo(NodeOutcome.ERROR).build();
    }

    // always perform an unlock/reset of the soft lock fields if the user is not locked
    var unlocked = resetSoftLockCounter(userId, accessToken)
    if (!unlocked) {
        logger.error("[RESET SOFT LOCK COUNTER] error while unlocking the user");
        sharedState.put("errorMessage", "An error occurred. Try again later.");
        sharedState.put("pagePropsJSON", JSON.stringify(
            {
                'errors': [{
                    label: "An error occurred. Try again later.",
                    token: "LOGIN_GENERAL_ERROR",
                    fieldName: "IDToken2",
                    anchor: "IDToken2"
                }]
            }));
        action = fr.Action.goTo(NodeOutcome.ERROR).build();
    } else {
        //need to temporarily transfer the pwd to shared state, for the subtree to pick it up (and clean it up afterwards)
        sharedState.put("password", transientState.get("password")); 
        action = fr.Action.goTo(NodeOutcome.SUCCESS).build();
    }
}catch(e){
    logger.error("[RESET SOFT LOCK COUNTER] error - "+e);
}