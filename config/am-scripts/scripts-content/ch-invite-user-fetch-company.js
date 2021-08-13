/* 
  ** INPUT DATA
    * QUERY PARAMETERS
      - 'companyNumber': the company number to invite users for
    
    * SHARED STATE:
      - '_id': session owner ID

    * TRANSIENT STATE
      - 'idmAccessToken': the IDM access token

  ** OUTPUT DATA
   
    * SHARED STATE:
      - 'companyData' : the company data which has been fetched
      - 'errorMessage': the error message to be displayed
      - 'pagePropsJSON': the JSON props for the UI

  ** OUTCOMES
    - success: input collected
    - error: an error occurred
  
  ** CALLBACKS: 
    - output: stage name and page props for UI
*/

var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback
)

var NodeOutcome = {
    SUCCESS: "success",
    RESEND_INVITE: "resend",
    ERROR: "error"
}

function fetchQueryParameters() {
    var companyNo = requestParameters.get("companyNumber");
    var userId = requestParameters.get("userId");

    if (!companyNo) {
        logger.error("[INVITE USER - GET COMPANY DETAILS] No Company Number found in request.");
        var errorMessage = "No Company Number found in request.";
        var errorProps = JSON.stringify(
            {
                'errors': [{
                    label: "No Company Number found in request.",
                    token: "INVITE_USER_NO_COMPANY_IN_REQUEST_ERROR"
                }]
            });

        if (callbacks.isEmpty()) {
            action = fr.Action.send(
                new fr.TextOutputCallback(fr.TextOutputCallback.ERROR, errorMessage),
                new fr.HiddenValueCallback("stage", "INVITE_USER_ERROR"),
                new fr.HiddenValueCallback("pagePropsJSON", errorProps)
            ).build();
        }
    } else {
        return {
            companyNo: companyNo.get(0),
            userId: userId ? userId.get(0) : null
        }
    }
}

//checks whether the user with the given email already exists in IDM
function getUserInfo(userId) {
    try {
        var idmUserIdEndpoint = idmUserEndpoint.concat(userId);
        var request = new org.forgerock.http.protocol.Request();
        var accessToken = transientState.get("idmAccessToken");
        if (!accessToken) {
            logger.error("[INVITE USER - GET USER DETAILS] Access token not in shared state");
            return {
                success: false,
                message: "Access token not in shared state"
            };
        }

        request.setMethod('GET');
        request.setUri(idmUserIdEndpoint);
        request.getHeaders().add("Authorization", "Bearer " + accessToken);
        request.getHeaders().add("Content-Type", "application/json");
        request.getHeaders().add("Accept-API-Version", "resource=1.0");

        var response = httpClient.send(request).get();

        if (response.getStatus().getCode() === 200) {
            var user = JSON.parse(response.getEntity().getString());
            if (user) {
                logger.error("[INVITE USER - GET USER DETAILS] user found: " + JSON.stringify(user));
                return {
                    success: true,
                    user: user
                }
            } else {
                logger.error("[INVITE USER - GET USER DETAILS] user NOT found: " + userId);
                return {
                    success: false,
                    message: "User not found: " + userId
                };
            }
        } else {
            logger.error("[INVITE USER - GET USER DETAILS] Error while fetching user: " + response.getStatus().getCode())
            return {
                success: false,
                message: "Error while fetching user: " + response.getStatus().getCode()
            };
        }
    } catch (e) {
        logger.error(e)
        return {
            success: false,
            message: "Error during user lookup: " + e
        };
    }
}

// gets company information
function getCompanyInfo(userId, companyNo) {

    var request = new org.forgerock.http.protocol.Request();
    var accessToken = transientState.get("idmAccessToken");
    if (accessToken == null) {
        logger.error("[INVITE USER - GET COMPANY DETAILS] Access token not in shared state");
        return NodeOutcome.ERROR;
    }

    var requestBodyJson =
    {
        "callerId": userId,
        "companyNumber": companyNo
    };

    request.setMethod('POST');
    logger.error("[INVITE USER - GET COMPANY DETAILS] Get company details for " + companyNo);
    request.setUri(idmCompanyAuthEndpoint + "?_action=getCompanyByNumber");
    request.getHeaders().add("Authorization", "Bearer " + accessToken);
    request.getHeaders().add("Content-Type", "application/json");
    request.getHeaders().add("Accept-API-Version", "resource=1.0");
    request.setEntity(requestBodyJson);

    var response = httpClient.send(request).get();
    var companyResponse = JSON.parse(response.getEntity().getString());
    if (response.getStatus().getCode() === 200) {
        logger.error("[INVITE USER - GET COMPANY DETAILS] 200 response from IDM");

        if (companyResponse.success) {
            return companyResponse.company;
        } else {
            logger.error("[INVITE USER - GET COMPANY DETAILS] Error during company lookup");
            var errorProps = JSON.stringify(
                {
                    'errors': [{
                        label: companyResponse.message,
                        token: "INVITE_USER_COMPANY_LOOKUP_ERROR"
                    }]
                });

            if (callbacks.isEmpty()) {
                action = fr.Action.send(
                    new fr.TextOutputCallback(fr.TextOutputCallback.ERROR, companyResponse.message),
                    new fr.HiddenValueCallback("stage", "INVITE_USER_ERROR"),
                    new fr.HiddenValueCallback("pagePropsJSON", errorProps)
                ).build();
            }
        }
    } else {
        logger.error("[INVITE USER - GET COMPANY DETAILS] Could not get company " + companyNo + " - Error " + response.getEntity().getString());
        return false;
    }
}

// main execution flow
try {
    var idmCompanyAuthEndpoint = "https://openam-companieshouse-uk-dev.id.forgerock.io/openidm/endpoint/companyauth/";
    var idmUserEndpoint = "https://openam-companieshouse-uk-dev.id.forgerock.io/openidm/managed/alpha_user/";
    var params = fetchQueryParameters();

    var sessionOwner = sharedState.get("_id");
    var companyData = getCompanyInfo(sessionOwner, params.companyNo);

    if (companyData) {
        sharedState.put("companyData", JSON.stringify(companyData));
        if (params.userId) {
            var userInfo = getUserInfo(params.userId);
            if (!userInfo.success) {
                sharedState.put("errorMessage", "Error while fetching user by ID: " + params.userId);
                logger.error("[INVITE USER - GET USER DETAILS] Error while fetching user by ID " + params.userId);
                outcome = NodeOutcome.ERROR;
            } else {
                sharedState.put("email", userInfo.user.userName);
                outcome = NodeOutcome.RESEND_INVITE;
            }
        } else {
            outcome = NodeOutcome.SUCCESS;
        }
    } else {
        sharedState.put("errorMessage", "Could not find a company with number " + params.companyNo);
        outcome = NodeOutcome.ERROR;
    }
} catch (e) {
    sharedState.put("errorMessage", e.toString());
    logger.error("[INVITE USER - GET COMPANY DETAILS] Error " + e);
    outcome = NodeOutcome.ERROR;
}