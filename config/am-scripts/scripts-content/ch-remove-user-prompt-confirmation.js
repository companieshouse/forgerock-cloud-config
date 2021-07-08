/* 
  ** INPUT DATA
    * QUERY PARAMS
     - companyNo: (optional) the company number to be looked up 

  ** INPUT DATA
    * SHARED STATE:
      - '_id' : the ID of the user performing the operation (session owner/actor)
      - [optional] 'errorMessage': error message to display from previous attempts
      - [optional] 'pagePropsJSON': the JSON props for the UI to display 
  
  ** OUTPUT DATA
    * SHARED STATE: 
      - 'companyData': the company data which has been previously looked up from IDM
      - 'userToRemove': id of the user to remove
      - [optional] 'errorMessage': error message to display from previous attempts
      - [optional] 'pagePropsJSON': the JSON props for the UI to display  
      
  ** OUTCOMES
    - 'confirmed': the user has confirmed the removal
    - 'missing_confirm': the user has tried to confirm removal without acknowledging the information
    - 'cancel': the user has cancelled the operation
    - 'error': an error has happened duing processing
*/

var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.NameCallback,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback,
    javax.security.auth.callback.ConfirmationCallback
)

var NodeOutcome = {
    CONFIRMED: "confirmed",
    MISSING_CONFIRM: "missing_confirm",
    CANCEL: "cancel",
    ERROR: "error"
}

var ConfirmReadIndex = {
    NO: "NO",
    YES: "YES"
}

var ConfirmRemoveIndex = {
    SUBMIT: 0,
    CANCEL: 1
}

function raiseError(message, token) {
    action = fr.Action.send(
        new fr.HiddenValueCallback(
            "stage",
            "REMOVE_AUTHZ_USER_ERROR"
        ),
        new fr.HiddenValueCallback(
            "pagePropsJSON",
            JSON.stringify({ "error": message, "token": token })
        ),
        new fr.TextOutputCallback(
            fr.TextOutputCallback.ERROR,
            message
        )
    ).build()
}

function debug(message) {
    action = fr.Action.send(
        new fr.TextOutputCallback(
            fr.TextOutputCallback.ERROR,
            message
        )
    ).build()
}

var confirmInfoReadCallback = new fr.NameCallback(
    "Choice (YES/NO)",
    ConfirmReadIndex.NO
);

var confirmRemoveCallback = new fr.ConfirmationCallback(
    "Do you want to cancel?",
    fr.ConfirmationCallback.INFORMATION,
    ["SUBMIT", "CANCEL"],
    ConfirmRemoveIndex.SUBMIT
);

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

//removes the user from the company
function removeUserFromCompany(callerId, companyNo, userIdToRemove) {
    logger.error("[REMOVE AUTHZ USER] Removing user " + userIdToRemove + " from company " + companyNo);
    var request = new org.forgerock.http.protocol.Request();
    var accessToken = sharedState.get("idmAccessToken");
    if (accessToken == null) {
        logger.error("[INVITE USER - RESPOND INVITE] Access token not in shared state");
        return {
            success: false,
            message: "Access token not in shared state"
        };
    }

    var requestBodyJson =
    {
        "callerId": callerId,
        "subjectId": userIdToRemove,
        "companyNumber": companyNo
    }

    request.setMethod('POST');

    request.setUri(idmCompanyAuthEndpoint + "?_action=removeAuthorisedUser");
    request.getHeaders().add("Authorization", "Bearer " + accessToken);
    request.getHeaders().add("Content-Type", "application/json");
    request.getHeaders().add("Accept-API-Version", "resource=1.0");
    request.setEntity(requestBodyJson);

    var response = httpClient.send(request).get();
    var actionResponse = JSON.parse(response.getEntity().getString());
    if (response.getStatus().getCode() === 200) {
        logger.error("[REMOVE AUTHZ USER] 200 response from IDM");
        return {
            success: actionResponse.success
        }
    } else {
        logger.error("[REMOVE AUTHZ USER] Error during action processing");
        return {
            success: false,
            message: actionResponse.detail.reason
        };
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

        if (callbacks.isEmpty()) {
            var companyLookupResponse = getCompanyInfo(companyNo);
            var userResponse = lookupUser(userIdToRemove);
            if (!userResponse.success) {
                raiseError(userResponse.message, "USER_NOT_FOUND");
            } else if (!companyLookupResponse.success) {
                raiseError(companyLookupResponse.message, "COMPANY_NOT_FOUND");
            } else {
                sharedState.put("companyData", JSON.stringify(companyLookupResponse.company));
                sharedState.put("userToRemove", JSON.stringify(userResponse.user));
                var userDisplayName = userResponse.user.givenName ? userResponse.user.givenName : userResponse.user.userName;
                var infoMessage = "Remove ".concat(userDisplayName, "'s authorisation to file online for company ").concat(companyLookupResponse.company.name);
                var errorMessage = sharedState.get("errorMessage");
                var level = fr.TextOutputCallback.INFORMATION;
                if (errorMessage !== null) {
                    var errorProps = sharedState.get("pagePropsJSON");
                    level = fr.TextOutputCallback.ERROR;
                    infoMessage = errorMessage.concat(" Please confirm you have read the information.");
                    action = fr.Action.send(
                        new fr.TextOutputCallback(level, infoMessage),
                        new fr.TextOutputCallback(fr.TextOutputCallback.INFORMATION, "I confirm that I have read and understood this information."),
                        //confirmInfoReadCallback,
                        confirmInfoReadCallback,
                        new fr.TextOutputCallback(fr.TextOutputCallback.INFORMATION, "Do you want to cancel?"),
                        confirmRemoveCallback,
                        new fr.HiddenValueCallback("stage", "REMOVE_USER_CONFIRM"),
                        new fr.HiddenValueCallback("pagePropsJSON", errorProps)
                    ).build();
                } else {
                    action = fr.Action.send(
                        new fr.TextOutputCallback(level, infoMessage),
                        new fr.TextOutputCallback(fr.TextOutputCallback.INFORMATION, "I confirm that I have read and understood this information."),
                        //confirmInfoReadCallback,
                        confirmInfoReadCallback,
                        new fr.TextOutputCallback(fr.TextOutputCallback.INFORMATION, "Do you want to cancel?"),
                        confirmRemoveCallback,
                        new fr.HiddenValueCallback("stage", "REMOVE_USER_CONFIRM")
                    ).build();
                }
            }
        } else {
            var userToRemove = sharedState.get("userToRemove");

            var confirmReadIndex = callbacks.get(2).getName();
            logger.error("[REMOVE AUTHZ USER] confirm read: " + confirmReadIndex);

            var confirmRemoveIndex = callbacks.get(4).getSelectedIndex();
            logger.error("[REMOVE AUTHZ USER] confirm remove: " + confirmRemoveIndex);

            if (confirmRemoveIndex === ConfirmRemoveIndex.SUBMIT) {
                if (!confirmReadIndex || confirmReadIndex === ConfirmReadIndex.NO) {
                    sharedState.put("errorMessage", "You need to read the info before proceeding.");
                    sharedState.put("pagePropsJSON", JSON.stringify(
                        {
                            'errors': [{
                                label: "You need to read the info before proceeding.",
                                token: "MISSING_CONFIRM_READ_ERROR",
                                fieldName: "IDToken3",
                                anchor: "IDToken3"
                            }]
                        }));
                    action = fr.Action.goTo(NodeOutcome.MISSING_CONFIRM).build();
                } else {
                    // removal logic
                    var removeResponse = removeUserFromCompany(sessionOwnerId, companyNo, userIdToRemove);
                    if (removeResponse.success) {
                        sharedState.put("idmAccessToken", null);
                        action = fr.Action.goTo(NodeOutcome.CONFIRMED).build();
                    } else {
                        raiseError(removeResponse.message, "USER_REMOVAL_FAILED");
                    }
                }
            } else {
                action = fr.Action.goTo(NodeOutcome.CANCEL).build();
            }
        }
    }
} catch (e) {
    logger.error("[REMOVE AUTHZ USER] ERROR: " + e);
    sharedState.put("errorMessage", e.toString());
    action = fr.Action.goTo(NodeOutcome.ERROR).build();
}

