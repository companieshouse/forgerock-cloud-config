/* 
  ** INPUT DATA
    * SHARED STATE:
      - 'errorMessage': the error message related to the failed login attempt
      - '_id"': the user ID which has been looked up in a previous step

    * TRANSIENT STATE
      - 'idmAccessToken': the IDM access token

  ** OUTPUT DATA
    * SHARED STATE:
      - 'errorMessage': the 'account locked' message, or the 'remaining attempts' message
      - 'pagePropsJSON': the JSON props for the UI to consume via callbacks
    
  ** OUTCOMES
    - true: counter incremented successfully
    - error: error while incrementing counter
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
    TRUE: "true",
    ERROR: "error"
}

function logResponse(response) {
    logger.error("[UPDATE SOFT LOCK COUNTER] Scripted Node HTTP Response: " + response.getStatus() + ", Body: " + response.getEntity().getString());
}

// reads the current invalid login attempts counter from frUnindexedInteger1
function getCounterValue(userId, accessToken) {

    var request = new org.forgerock.http.protocol.Request();

    request.setMethod('GET');
    request.setUri(alphaUserUrl + userId);
    request.getHeaders().add("Authorization", "Bearer " + accessToken);
    request.getHeaders().add("Content-Type", "application/json");
    var response = httpClient.send(request).get();
    if (response.getStatus().getCode() === 200) {
        var userResponse = JSON.parse(response.getEntity().getString());
        var counter = userResponse.frUnindexedInteger1;
        return counter || 0;
    } else {
        logger.error("[UPDATE SOFT LOCK COUNTER] Error while getting counter value: " + response.getStatus().getCode())
        return false;
    }
}

// updates the invalid login attempts counter by setting the provided value into frUnindexedInteger1
function updateCounterValue(userId, value, accessToken) {

    logger.error("[UPDATE SOFT LOCK COUNTER] Updating counter to " + value);
    var convertedCounter = fr.Integer.valueOf(value);
    var request = new org.forgerock.http.protocol.Request();
    request.setMethod('PATCH');
    request.setUri(alphaUserUrl + userId);
    request.getHeaders().add("Authorization", "Bearer " + accessToken);
    request.getHeaders().add("Content-Type", "application/json");
    var requestBodyJson = [
        {
            "operation": "replace",
            "field": "/frUnindexedInteger1",
            "value": convertedCounter
        }
    ];
    request.setEntity(requestBodyJson);
    //logger.error("[UPDATE SOFT LOCK COUNTER] request JSON: " + JSON.stringify(requestBodyJson));

    var response = httpClient.send(request).get();

    logResponse(response);

    if (response.getStatus().getCode() === 200) {
        logger.error("[UPDATE SOFT LOCK COUNTER] Counter updated correctly");
        return convertedCounter;
    } else {
        logger.error("[UPDATE SOFT LOCK COUNTER] Error while updating counter value: " + response.getStatus().getCode());
        return false;
    }
}

// soft locks the user, by setting the soft lock date (in UNIX date format) into frIndexedString4
function performSoftLock(userId, accessToken) {

    var dateNow = new Date();
    var request = new org.forgerock.http.protocol.Request();
    request.setMethod('PATCH');
    request.setUri(alphaUserUrl + userId);
    request.getHeaders().add("Authorization", "Bearer " + accessToken);
    request.getHeaders().add("Content-Type", "application/json");
    var requestBodyJson = [
        {
            "operation": "replace",
            "field": "/frIndexedString4",
            "value": dateNow.toString()
        }
    ];
    request.setEntity(requestBodyJson);
    //logger.error("[UPDATE SOFT LOCK COUNTER] request JSON: " + JSON.stringify(requestBodyJson));

    var response = httpClient.send(request).get();
    logResponse(response);

    if (response.getStatus().getCode() === 200) {
        logger.error("[UPDATE SOFT LOCK COUNTER] Soft lock date set correctly");
        return NodeOutcome.TRUE;
    } else {
        logger.error("[UPDATE SOFT LOCK COUNTER] Error while setting soft lock date: " + response.getStatus().getCode());
        return NodeOutcome.ERROR;
    }
}

// main execution flow

var SOFT_LOCK_THRESHOLD = 5;
var SOFT_LOCK_MINUTES = 5;
var errorMessage = sharedState.get("errorMessage");
logger.error("[UPDATE SOFT LOCK COUNTER] error message from login flow: " + errorMessage);

if (errorMessage.equals("Enter a correct username and password.")) {
    var userId = sharedState.get("_id");

    if (userId == null) {
        logger.error("[UPDATE SOFT LOCK COUNTER] No user name in shared state");
        action = fr.Action.goTo(NodeOutcome.ERROR).build();
    }

    var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);
    if (accessToken == null) {
        logger.error("[UPDATE SOFT LOCK COUNTER] Access token not in transient state")
        action = fr.Action.goTo(NodeOutcome.ERROR).build();
    }

    var counter = getCounterValue(userId, accessToken);
    logger.error("[UPDATE SOFT LOCK COUNTER] Value of counter: " + counter);
    if (counter === false) {
        action = fr.Action.goTo(NodeOutcome.ERROR).build();
    } else {
        var newCounter = updateCounterValue(userId, counter + 1, accessToken);
        if (!newCounter) {
            action = fr.Action.goTo(NodeOutcome.ERROR).build();
        } else if (newCounter === SOFT_LOCK_THRESHOLD) {
            outcome = performSoftLock(userId, accessToken);
            if (outcome === NodeOutcome.TRUE) {
                logger.error("[UPDATE SOFT LOCK COUNTER] soft lock performed successfully");
                sharedState.put("errorMessage", "You have entered incorrect details too many times. Your account is now locked for ".concat(String(SOFT_LOCK_MINUTES), " minutes."));
                sharedState.put("pagePropsJSON", JSON.stringify(
                    {
                        'errors': [{
                            label: "You have entered incorrect details too many times. Your account is now locked for ".concat(String(SOFT_LOCK_MINUTES), " minutes."),
                            token: "SOFT_LOCK_ERROR",
                            fieldName: "IDToken1",
                            anchor: "IDToken1"
                        }],
                        "softLockMinutes": SOFT_LOCK_MINUTES
                    }));
            }
        } else {
            var softLockMsg = "";
            var softLockToken = "";
            var remainingAttempts = (SOFT_LOCK_THRESHOLD - newCounter);        
            if(newCounter === SOFT_LOCK_THRESHOLD - 1){
                softLockMsg = "Enter a correct email address and password. You have 1 attempt left. If the details you enter are incorrect again your account will be locked for ".concat(String(SOFT_LOCK_MINUTES), " minutes.");
                softLockToken = "SOFT_LOCK_LAST_ATTEMPT";
            }else{
                softLockMsg = "Enter a correct email address and password. You have ".concat(String(remainingAttempts), " attempts left.");
                softLockToken = "SOFT_LOCK_REMAINING_ATTEMPTS";
            }
            sharedState.put("errorMessage", softLockMsg);
            sharedState.put("pagePropsJSON", JSON.stringify(
                {
                    'errors': [{
                        label: softLockMsg,
                        token: softLockToken,
                        fieldName: "IDToken1",
                        anchor: "IDToken1"
                    }],
                    "remainingAttempts": (SOFT_LOCK_THRESHOLD - newCounter),
                    "softLockMinutes": SOFT_LOCK_MINUTES
                }));
            action = fr.Action.goTo(NodeOutcome.TRUE).build();
        }
    }
}

outcome = NodeOutcome.TRUE;
