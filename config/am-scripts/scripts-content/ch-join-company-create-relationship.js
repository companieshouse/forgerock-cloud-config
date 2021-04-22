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
    logger.error("[FETCH COMPANY] Scripted Node HTTP Response: " + response.getStatus() + ", Body: " + response.getEntity().getString());
}

// checks whether the user has already the company associated with their profile
function checkCompanyAlreadyExists(userId, company){
    var request = new org.forgerock.http.protocol.Request();
    
    request.setMethod('GET');
    logger.error("[CHECK COMPANY DUPLICATE] calling endpoint " + idmUserEndpoint + userId + "?_fields=isAuthorisedUserOf/_id");
    request.setUri(idmUserEndpoint + userId + "?_fields=isAuthorisedUserOf/_id");
    request.getHeaders().add("Authorization", "Bearer " + accessToken);
    request.getHeaders().add("Content-Type", "application/json");
    request.getHeaders().add("Accept-API-Version", "resource=1.0");

    var response = httpClient.send(request).get();

    logResponse(response);

    var userProfile = JSON.parse(response.getEntity().getString());

    logger.error("[CHECK COMPANY DUPLICATE] User companies: "+userProfile.isAuthorisedUserOf.length);
    for (var index = 0; index < userProfile.isAuthorisedUserOf.length; index++) {
        var userCompanyId = userProfile.isAuthorisedUserOf[index]._id;
        if(userCompanyId.equals(company._id)){
            return true;
        }
    }
    return false;
}

//creates the relationship between the user and the given company
function addRelationshipToCompany(userId, company){
    var request = new org.forgerock.http.protocol.Request();
    var ACCESS_TOKEN_STATE_FIELD = "idmAccessToken";
    var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);
    if (accessToken == null) {
        logger.error("[ADD RELATIONSHIP] Access token not in shared state")
        return NodeOutcome.ERROR;
    }

    var requestBodyJson = [
        {
            "operation": "add",
            "field": "/isAuthorisedUserOf/-",
            "value": {
                "_ref": "managed/Company/"+company._id,
                "_refProperties":  {
                    "permissionAdmin": "true"
                }
            }
        }
    ];

    request.setMethod('PATCH');
    request.setUri(idmUserEndpoint + userId);
    request.getHeaders().add("Authorization", "Bearer " + accessToken);
    request.getHeaders().add("Content-Type", "application/json");
    request.getHeaders().add("Accept-API-Version", "resource=1.0");
    request.setEntity(requestBodyJson);

    var response = httpClient.send(request).get();

    logResponse(response);
    if (response.getStatus().getCode() === 200) {
        logger.error("[ADD RELATIONSHIP] 200 response from IDM");  
        return NodeOutcome.TRUE;
    }
    else {
        logger.error("[ADD RELATIONSHIP] Error during relationship creation");
        return NodeOutcome.ERROR;
    }
}

// builds an error callback given a stage name and a message text
function buildErrorCallback(stageName, message) {
    if (callbacks.isEmpty()) {
        action = fr.Action.send(
            new fr.HiddenValueCallback (
                "stage",
                stageName 
            ),
              new fr.TextOutputCallback(
                fr.TextOutputCallback.ERROR,
                message
            ),
            new fr.HiddenValueCallback (
                "pagePropsJSON",
                JSON.stringify({ 'errors': [{ label: message} ] })
            )
        ).build()
    }
}

//fetches the IDM access token from transient state
function fetchIDMToken(){
    var ACCESS_TOKEN_STATE_FIELD = "idmAccessToken";
    var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);
    if (accessToken == null) {
        logger.error("[CHECK COMPANY DUPLICATE] Access token not in transient state")
        return false;
    }
    return accessToken;
}

// main execution flow

var idmUserEndpoint = "https://openam-companieshouse-uk-dev.id.forgerock.io/openidm/managed/alpha_user/";
var companyData = sharedState.get("companyData");
var userId = sharedState.get("_id");
logger.error("[ADD RELATIONSHIP] Incoming company data :" +companyData);
logger.error("[ADD RELATIONSHIP] Incoming company id :" +JSON.parse(companyData)._id);

var accessToken = fetchIDMToken();
if(!accessToken){
    action = fr.Action.goTo(NodeOutcome.NodeOutcome.ERROR).build();
} 

if(checkCompanyAlreadyExists(userId, JSON.parse(companyData))){
    logger.error("[ADD RELATIONSHIP] The company " + JSON.parse(companyData).name + " is already associated with this user");
    sharedState.put("errorMessage","The company " + JSON.parse(companyData).name + " is already associated with the user.");
    sharedState.put("pagePropsJSON", JSON.stringify(
        {
            'errors': [{
                label: "The company ${companyNumber} is already associated with this user",
                token: "COMPANY_ALREADY_ASSOCIATED",
                fieldName: "IDToken2",
                anchor: "IDToken2"
            }],
            'companyNumber': JSON.parse(companyData).name
        }));
    // sharedState.put("createRelationshipErrorType", "COMPANY_ALREADY_ASSOCIATED");
    // sharedState.put("createRelationshipErrorField", "IDToken2");
    action = fr.Action.goTo(NodeOutcome.COMPANY_ALREADY_ASSOCIATED).build();
}

if(!JSON.parse(companyData).authCodeIsActive){
    logger.error("[ADD RELATIONSHIP] The company " + JSON.parse(companyData).name + " does not have an active auth code");
    sharedState.put("errorMessage","The company " + JSON.parse(companyData).name + " does not have an active auth code.");
    // sharedState.put("createRelationshipErrorType", "AUTH_CODE_INACTIVE");
    // sharedState.put("createRelationshipErrorField", "IDToken1");
    sharedState.put("pagePropsJSON", JSON.stringify(
        {
            'errors': [{
                label: "The company ${companyNumber} does not have an active auth code.",
                token: "AUTH_CODE_INACTIVE",
                fieldName: "IDToken1",
                anchor: "IDToken1"
            }],
            'companyNumber': JSON.parse(companyData).name
        }));
    action = fr.Action.goTo(NodeOutcome.AUTH_CODE_INACTIVE).build();        
} 

outcome = addRelationshipToCompany(userId, JSON.parse(companyData));
