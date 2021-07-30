/* 
  ** INPUT DATA
    * SHARED STATE:
      - 'companyData' : the result of the company lookup by ID
      - '_id' : the user ID we need to create the asscoiation for. This can be manually populated or be result of a previous execution of the 'Identify Exisitng User' node
    * TRANSIENT STATE
      - 'idmAccessToken' : the IDM Access Token, which can be obtained by executing a scripted decision node configured with the script 'CH - Get IDM Access Token'
  ** OUTPUT DATA:
    * SHARED STATE
      - 'errorMessage': set if an error is raised which needs to be displayed to the user
  ** OUTCOMES
    - true: association successful
    - error: error during association (IDM token not found, error during relationship creation)
    - already_associated: company is already associated with the user
  
  ** CALLBACKS: 
    - error: user is already associated with a company
*/

var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback,
    org.forgerock.http.protocol.Entity
)

var NodeOutcome = {
    TRUE: "true",
    ERROR: "error",
    COMPANY_ALREADY_ASSOCIATED: "already_associated",
    AUTH_CODE_INACTIVE: "auth_code_inactive"
}

function logResponse(response) {
    logger.error("[ADD RELATIONSHIP] Scripted Node HTTP Response: " + response.getStatus() + ", Body: " + response.getEntity().getString());
}

// checks whether the user has already the company associated with their profile
function checkUserAlreadyAuthzForCompany(userId, company) {
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
        "companyNumber": company.number
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
        return (actionResponse.success && actionResponse.company.status === "confirmed");
    } else {
        logger.error("[ADD AUTHZ USER] Error during action processing");
        return false;
    }
}

//creates the relationship between the user and the given company
function addRelationshipToCompany(userId, company) {
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
        "companyNumber": company.number
    }

    request.setMethod('POST');

    request.setUri(idmCompanyAuthEndpoint + "?_action=addAuthorisedUser");
    request.getHeaders().add("Authorization", "Bearer " + accessToken);
    request.getHeaders().add("Content-Type", "application/json");
    request.getHeaders().add("Accept-API-Version", "resource=1.0");
    request.setEntity(requestBodyJson);

    var response = httpClient.send(request).get();
    var actionResponse = JSON.parse(response.getEntity().getString());
    if (response.getStatus().getCode() === 200) {
        logger.error("[ADD AUTHZ USER] 200 response from IDM");
        return {
            success: actionResponse.success
        }
    } else {
        logger.error("[ADD AUTHZ USER] Error during action processing - "+ actionResponse.detail.reason);
        return {
            success: false,
            message: actionResponse.detail.reason
        };
    }
}

// builds an error callback given a stage name and a message text
function buildErrorCallback(stageName, message) {
    if (callbacks.isEmpty()) {
        action = fr.Action.send(
            new fr.HiddenValueCallback(
                "stage",
                stageName
            ),
            new fr.TextOutputCallback(
                fr.TextOutputCallback.ERROR,
                message
            ),
            new fr.HiddenValueCallback(
                "pagePropsJSON",
                JSON.stringify({ 'errors': [{ label: message }] })
            )
        ).build()
    }
}

function debug(message) {
    action = fr.Action.send(
        new fr.TextOutputCallback(
            fr.TextOutputCallback.ERROR,
            message
        )
    ).build()
}

//fetches the IDM access token from transient state
function fetchIDMToken() {
    var ACCESS_TOKEN_STATE_FIELD = "idmAccessToken";
    var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);
    if (accessToken == null) {
        logger.error("[ADD RELATIONSHIP] Access token not in transient state")
        return false;
    }
    return accessToken;
}

//extracts the language form headers (default to EN)
function getSelectedLanguage(requestHeaders) {
    if (requestHeaders && requestHeaders.get("Chosen-Language")) {
        var lang = requestHeaders.get("Chosen-Language").get(0);
        logger.error("[ADD RELATIONSHIP] selected language: " + lang);
        return lang;
    }
    logger.error("[ADD RELATIONSHIP] no selected language found - defaulting to EN");
    return 'EN';
}

// main execution flow
try {
    var idmCompanyAuthEndpoint = "https://openam-companieshouse-uk-dev.id.forgerock.io/openidm/endpoint/companyauth/";
    var idmUserEndpoint = "https://openam-companieshouse-uk-dev.id.forgerock.io/openidm/managed/alpha_user/";
    var companyData = sharedState.get("companyData");
    var userId = sharedState.get("_id");
    logger.error("[ADD RELATIONSHIP] Incoming company data :" + companyData);
    logger.error("[ADD RELATIONSHIP] Incoming company id :" + JSON.parse(companyData)._id);
    var language = getSelectedLanguage(requestHeaders);

    var accessToken = fetchIDMToken();
    if (!accessToken) {
        action = fr.Action.goTo(NodeOutcome.NodeOutcome.ERROR).build();
    }

    if (checkUserAlreadyAuthzForCompany(userId, JSON.parse(companyData))) {
        logger.error("[ADD RELATIONSHIP] The user is already authorised (CONFIRMED) for company " + JSON.parse(companyData).name);
        sharedState.put("errorMessage", "The company " + JSON.parse(companyData).name + " is already associated with the user.");
        sharedState.put("pagePropsJSON", JSON.stringify(
            {
                'errors': [{
                    label: "The company " + JSON.parse(companyData).name + " is already associated with this user",
                    token: "COMPANY_ALREADY_ASSOCIATED",
                    fieldName: "IDToken2",
                    anchor: "IDToken2"
                }],
                'company': JSON.parse(companyData)
            }));
        action = fr.Action.goTo(NodeOutcome.COMPANY_ALREADY_ASSOCIATED)
            .putSessionProperty("language", language.toLowerCase())
            .build();
    } else if (!JSON.parse(companyData).authCodeIsActive) {
        logger.error("[ADD RELATIONSHIP] The company " + JSON.parse(companyData).name + " does not have an active auth code");
        sharedState.put("errorMessage", "The company " + JSON.parse(companyData).name + " does not have an active auth code.");
        sharedState.put("pagePropsJSON", JSON.stringify(
            {
                'errors': [{
                    label: "The company " + JSON.parse(companyData).name + "does not have an active auth code.",
                    token: "AUTH_CODE_INACTIVE",
                    fieldName: "IDToken1",
                    anchor: "IDToken1"
                }],
                'company': JSON.parse(companyData)
            }));
        action = fr.Action.goTo(NodeOutcome.AUTH_CODE_INACTIVE).build();
    } else {
        var addUserResult = addRelationshipToCompany(userId, JSON.parse(companyData));
        action = fr.Action.goTo(addUserResult.success ? NodeOutcome.TRUE : NodeOutcome.ERROR)
            .putSessionProperty("language", language.toLowerCase())
            .build();
    }
} catch (e) {
    logger.error("[ADD RELATIONSHIP] ERROR: " + e);
    sharedState.put("errorMessage", e.toString());
    action = fr.Action.goTo(NodeOutcome.ERROR).build();
}