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

//updates the username (=email) of the given user 
function updateUsername(userId, value) {
    var alphaUserUrl = FIDC_ENDPOINT.concat("/openidm/managed/alpha_user/" + userId);
    var accessToken = transientState.get("idmAccessToken");
    if (accessToken == null) {
        logger.error("[CHANGE EMAIL PATCH] Access token not in shared state")
        return {
            success: false,
            message: "Access token not in transient state"
        }
    }
    logger.error("[CHANGE EMAIL PATCH] Updating email to " + value);

    var request = new org.forgerock.http.protocol.Request();
    request.setMethod('PATCH');
    request.setUri(alphaUserUrl);
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
        logger.error("[CHANGE EMAIL PATCH] User email updated correctly");
        return true;
    } else {
        logger.error("[CHANGE EMAIL PATCH] Error while updating email value: " + response.getStatus().getCode());
        return false;
    }
}

//checks whether the user with the given email already exists in IDM
function checkUserExistence(email) {
    var alphaUserUrl = FIDC_ENDPOINT.concat("/openidm/managed/alpha_user?_queryFilter=userName+eq+%22" + email + "%22");
    var request = new org.forgerock.http.protocol.Request();
    var accessToken = transientState.get("idmAccessToken");
    if (accessToken == null) {
        logger.error("[CHANGE EMAIL PATCH] Access token not in shared state")
        return {
            success: false,
            message: "Access token not in transient state"
        }
    }

    request.setMethod('GET');
    request.setUri(alphaUserUrl);
    request.getHeaders().add("Authorization", "Bearer " + accessToken);
    request.getHeaders().add("Content-Type", "application/json");
    request.getHeaders().add("Accept-API-Version", "resource=1.0");

    var response = httpClient.send(request).get();

    if (response.getStatus().getCode() === 200) {
        var searchResponse = JSON.parse(response.getEntity().getString());
        if (searchResponse && searchResponse.result && searchResponse.result.length > 0) {
            logger.error("[CHECK USER EXIST] user found: " + searchResponse.result[0].toString());
            return {
                success: true,
                userFound: true
            }
        } else {
            logger.error("[CHECK USER EXIST] user NOT found: " + email);
            return {
                success: true,
                userFound: false
            }
        }
    } else {
        logger.error("[CHECK USER EXIST] Error while checking user existence: " + response.getStatus().getCode())
        return {
            success: false,
            message: "Error while checking user existence: " + response.getStatus().getCode()
        }
    }
}

try {
    var FIDC_ENDPOINT = "https://openam-companieshouse-uk-dev.id.forgerock.io";
    //var alphaUserUrl  = "https://openam-companieshouse-uk-dev.id.forgerock.io/openidm/managed/alpha_user/";
    var newEmail = sharedState.get("newEmail");
    var sessionOwnerId = sharedState.get("_id");
    var userExistenceCheckResponse = checkUserExistence(newEmail);

    if(!userExistenceCheckResponse.success){
        sharedState.put("errorMessage", userExistenceCheckResponse.message);
        sharedState.put("pagePropsJSON", JSON.stringify(
            {
                'errors': [{
                    label: userExistenceCheckResponse.message,
                    token: "CHANGE_EMAIL_ERROR",
                    fieldName: "IDToken2",
                    anchor: "IDToken2"
                }]
            }));
        outcome = NodeOutcome.ERROR;
    } else if(userExistenceCheckResponse.success && userExistenceCheckResponse.userFound){
        sharedState.put("errorMessage", "A user with this email already exists - please choose a different email");
        sharedState.put("pagePropsJSON", JSON.stringify(
            {
                'errors': [{
                    label: "A user with this email already exist",
                    token: "EMAIL_EXISTS_ERROR",
                    fieldName: "IDToken2",
                    anchor: "IDToken2"
                }]
            }));
        outcome = NodeOutcome.ERROR;
    } else {
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
            sharedState.put("username", newEmail);
            outcome = NodeOutcome.SUCCESS;
        }
    }
} catch (e) {
    logger.error("[CHANGE EMAIL PATCH] error " + e);
    sharedState.put("errorMessage", e.toString());
    outcome = NodeOutcome.ERROR;
}