var ACCESS_TOKEN_STATE_FIELD = "idmAccessToken"
var idmEndpoint = "https://openam-companieshouse-uk-dev.id.forgerock.io/openidm/policy/managed/alpha_user/*?_action=validateProperty"

var NodeOutcome = {
    PASS: "pass",
    FAIL: "fail",
    ERROR: "error"
}

var VAR_PASSWORD = "newPassword";

function logResponse(response) {
    logger.error("[CHANGE PWD - POLICY CHECK] Scripted Node HTTP Response: " + response.getStatus() + ", Body: " + response.getEntity().getString());
}

function setPolicyErrorMessage(policyResponse) {
    var failedPolicyRequirements = policyResponse.failedPolicyRequirements;

    sharedState.put("errorMessage", "The new password does not meet the password policy requirements.");
    sharedState.put("pagePropsJSON", JSON.stringify(
        {
            'errors': [{
                label: "The new password does not meet the password policy requirements.",
                token: "PWD_POLICY_ERROR",
                fieldName: "IDToken2",
                anchor: "IDToken2"
            }],
            'failedPolicies': failedPolicyRequirements
        }));
}

function policyCompliant(pwd) {
    logger.error("[CHANGE PWD - POLICY CHECK] Checking password [" + pwd + "] against policy");
    var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);
    if (accessToken == null) {
        logger.error("[CHANGE PWD - POLICY CHECK] Access token not in transient state");
        sharedState.put("errorMessage", "Access token not in transient state");
        return NodeOutcome.ERROR;
    }

    var request = new org.forgerock.http.protocol.Request();
    var requestBodyJson = {
        "object": {},
        "properties": {
            "password": pwd
        }
    }
    request.setMethod('POST');
    request.setUri(idmEndpoint);
    request.getHeaders().add("Authorization", "Bearer " + accessToken);
    request.getHeaders().add("Content-Type", "application/json");
    request.setEntity(requestBodyJson);

    var response = httpClient.send(request).get();

    logResponse(response);
    if (response.getStatus().getCode() === 200) {
        logger.error("[CHANGE PWD - POLICY CHECK] 200 response from IDM");
        var policyResponse = JSON.parse(response.getEntity().getString());
        if (policyResponse == null) {
            logger.error("[CHANGE PWD - POLICY CHECK] No policy result in response");
            sharedState.put("errorMessage", "No policy result in response");
            return NodeOutcome.ERROR;
        }
        var compliant = policyResponse.result;
        if (compliant) {
            logger.error("[CHANGE PWD - POLICY CHECK] Password compliant with policy");
            sharedState.put("errorMessage", null);
            sharedState.put("pagePropsJSON", null);
            //transientState.put("newPassword", newPassword);
            return NodeOutcome.PASS;
        }
        else {
            logger.error("[CHANGE PWD - POLICY CHECK] Password not compliant with policy");
            sharedState.put("errorMessage", "Password not compliant with policy");
            setPolicyErrorMessage(policyResponse);
            return NodeOutcome.FAIL;
        }
    }
    else if (response.getStatus().getCode() === 401) {
        logger.error("[CHANGE PWD - POLICY CHECK] Authentication failed for policy lookup");
        sharedState.put("errorMessage", "Authentication failed for policy lookup");
        return NodeOutcome.ERROR;
    }

    logger.error("[CHANGE PWD - POLICY CHECK] Error");
    sharedState.put("errorMessage", "[CHANGE PWD - POLICY CHECK] Error");
    return NodeOutcome.ERROR;
}

// Main execution path

var newPassword = transientState.get(VAR_PASSWORD);

if (newPassword == null) {
    logger.error("[CHANGE PWD - POLICY CHECK] No password in shared state for policy evaluation");
    outcome = NodeOutcome.ERROR;
}
else {
    try {
        outcome = policyCompliant(newPassword);
    } catch (e) {
        logger.error("[CHANGE PWD - POLICY CHECK] error! " + e);
        sharedState.put("errorMessage", e.toString());
        outcome = NodeOutcome.ERROR;
    }
}