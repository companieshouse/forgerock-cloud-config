var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.NameCallback,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback,
    javax.security.auth.callback.ConfirmationCallback,
    org.forgerock.openam.authentication.callbacks.BooleanAttributeInputCallback
)

var NodeOutcome = {
    SUCCESS: "success",
    ERROR: "error"
}

function raiseError(message, token) {
    action = fr.Action.send(
        new fr.HiddenValueCallback(
            "stage",
            "REMOVE_AUTHZ_USER_ERROR"
        ),
        new fr.HiddenValueCallback(
            "pagePropsJSON",
            JSON.stringify({ 
                "errors": [{
                  label: message, 
                  token: token
                }]}
            )
        ),
        new fr.TextOutputCallback(
            fr.TextOutputCallback.ERROR,
            message
        )
    ).build()
}

// gets company information
function getCompanyInfo(companyNo) {

    var request = new org.forgerock.http.protocol.Request();
    var accessToken = transientState.get("idmAccessToken");
    if (accessToken == null) {
        logger.error("[REMOVE AUTHZ USER] Access token not in transient state");
        return {
            success: false,
            message: "Access token not in transient state"
        }
    }

    var requestBodyJson =
    {
        "companyNumber": companyNo
    };

    request.setMethod('POST');
    logger.error("[REMOVE AUTHZ USER] Get company details for " + companyNo);
    request.setUri(idmCompanyAuthEndpoint + "?_action=getCompanyByNumber");
    request.getHeaders().add("Authorization", "Bearer " + accessToken);
    request.getHeaders().add("Content-Type", "application/json");
    request.getHeaders().add("Accept-API-Version", "resource=1.0");
    request.setEntity(requestBodyJson);

    var response = httpClient.send(request).get();
    var companyResponse = JSON.parse(response.getEntity().getString());
    if (response.getStatus().getCode() === 200) {
        logger.error("[REMOVE AUTHZ USER] 200 response from IDM");

        if (companyResponse.success) {
            return {
                success: true,
                company: companyResponse.company
            }
        } else {
            return {
                success: false,
                message: companyResponse.message
            }
        }
    } else {
        return {
            success: false,
            message: "Error during GET company: code " + response.getStatus().getCode()
        }
    }
}

// reads the current invalid login attempts counter from frUnindexedInteger1
function lookupUser(userId) {
    try {
        var accessToken = transientState.get("idmAccessToken");
        if (accessToken == null) {
            logger.error("[REMOVE AUTHZ USER] Access token not in transient state")
            return {
                success: false,
                message: "Access token not in transient state"
            }
        } else {
            sharedState.put("idmAccessToken", accessToken);
        }

        var request = new org.forgerock.http.protocol.Request();

        request.setMethod('GET');
        request.setUri(alphaUserUrl + userId);
        request.getHeaders().add("Authorization", "Bearer " + accessToken);
        request.getHeaders().add("Content-Type", "application/json");
        var response = httpClient.send(request).get();
        if (response.getStatus().getCode() === 200) {
            return {
                success: true,
                user: JSON.parse(response.getEntity().getString())
            }
        } else {
            logger.error("[REMOVE AUTHZ USER] Error while looking up user: " + response.getStatus().getCode())
            return {
                success: false,
                message: "Error while GET user: " + response.getStatus().getCode()
            }
        }
    } catch (e) {
        logger.error("[REMOVE AUTHZ USER] lookup User error: " + e);
        return {
            success: false,
            message: "Error while looking up user: " + e
        };
    }
}

//extracts the company number and user ID from the query parameters
function fetchParameters() {
    var companyNo = requestParameters.get("companyNumber");
    var userId = requestParameters.get("userId");
    if (companyNo && userId) {
        logger.error("[REMOVE AUTHZ USER] company number/userId found in request: " + companyNo.get(0) + " - " + userId.get(0));
        return {
            companyNo: companyNo.get(0),
            userId: userId.get(0)
        }
    }
    logger.error("[REMOVE AUTHZ USER] Company number or userId not found in request");
    return false;
}

function getSubjectStatusForCompany(userId, companyNo) {
    var request = new org.forgerock.http.protocol.Request();

    var accessToken = transientState.get("idmAccessToken");
    if (accessToken == null) {
        logger.error("[ADD RELATIONSHIP] Access token not in transient state")
        return {
            success: false,
            message: "Access token not in transient state"
        };
    }

    var requestBodyJson =
    {
        "subjectId": userId,
        "companyNumber": companyNo
    }

    request.setMethod('POST');

    request.setUri(idmCompanyAuthEndpoint + "?_action=getCompanyStatusByUserId");
    request.getHeaders().add("Authorization", "Bearer " + accessToken);
    request.getHeaders().add("Content-Type", "application/json");
    request.getHeaders().add("Accept-API-Version", "resource=1.0");
    request.setEntity(requestBodyJson);

    var response = httpClient.send(request).get();
    var actionResponse = JSON.parse(response.getEntity().getString());
    if (response.getStatus().getCode() === 200) {
        logger.error("[ADD AUTHZ USER] 200 response from IDM");
        return actionResponse;
    } else {
        logger.error("[ADD AUTHZ USER] Error during action processing");
        return false;
    }
}

// execution flow
var idmCompanyAuthEndpoint = "https://openam-companieshouse-uk-dev.id.forgerock.io/openidm/endpoint/companyauth/";
var alphaUserUrl = "https://openam-companieshouse-uk-dev.id.forgerock.io/openidm/managed/alpha_user/";
try {
    var paramsResponse = fetchParameters();
    if (!paramsResponse) {
        raiseError("Missing company number and/or userId from request", "MISSING_PARAMS");
    } else {
        var companyNo = paramsResponse.companyNo;
        var userIdToRemove = paramsResponse.userId;
        var sessionOwnerId = sharedState.get("_id");

        var companyLookupResponse = getCompanyInfo(companyNo);
        var userResponse = lookupUser(userIdToRemove);
        var statuResponse = getSubjectStatusForCompany(userIdToRemove, companyNo);

        if (!userResponse.success) {
            raiseError(userResponse.message, "USER_NOT_FOUND");
        } else if (!companyLookupResponse.success) {
            raiseError(companyLookupResponse.message, "COMPANY_NOT_FOUND");
        } else if (!statuResponse || !statuResponse.success) {
            raiseError("Cannot check userstatus", "USER_STATUS_ERROR");
        } else {
            sharedState.put("companyData", JSON.stringify(companyLookupResponse.company));
            sharedState.put("userToRemove", JSON.stringify(userResponse.user));
            sharedState.put("subjectStatus", statuResponse.company.status);
            action = fr.Action.goTo(NodeOutcome.SUCCESS).build();
        }
    }
} catch (e) {
    logger.error("[REMOVE AUTHZ USER - FETCH] ERROR: " + e);
    sharedState.put("errorMessage", "[REMOVE AUTHZ USER - FETCH] " + e.toString());
    action = fr.Action.goTo(NodeOutcome.ERROR).build();
}

