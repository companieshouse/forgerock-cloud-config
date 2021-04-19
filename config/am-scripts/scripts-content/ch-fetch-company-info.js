/* 
  ** INPUT DATA
    * SHARED STATE:
    - 'companyNumber' : the company number we need to lookup 
    * TRANSIENT STATE
    - 'idmAccessToken' : the IDM Access Token, which can be obtained by executing a scripted decision node configured with the script 'CH - Get IDM Access Token'

  ** OUTPUT DATA
    * SHARED STATE:
    - 'companyData': the company data, result of the lookup
    - 'hashedCredential': the company auth code
    - [optional] 'errorMessage': error message to display from previous attempts

  ** OUTCOMES
    - true: user confirms to go ahdead with association
    - false: user goes back to company selection, or no company number found in context, auth code not set for company, company cannot be found in IDM, generic error
    - error: IDM token not found
  
  ** CALLBACKS:
    - Output INFO: Display of company information
    - Input: User confirmation if they want to file for this company (YES proceeds to association, NO goes back to company no. prompt)
    - Output ERROR: Error - company number not found
*/

var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback,
    javax.security.auth.callback.ConfirmationCallback
)

var NodeOutcome = {
    TRUE: "true",
    FALSE: "false",
    ERROR: "error"
}

function logResponse(response) {
    logger.error("[FETCH COMPANY] Scripted Node HTTP Response: " + response.getStatus() + ", Body: " + response.getEntity().getString());
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
        logger.error("[FETCH COMPANY] Access token not in transient state")
        return false;
    }
    return accessToken;
}

// fetch the Company object given a company number
function fetchCompany(idmToken, companyNumber) {
    if (companyNumber == null) {
        logger.error("[FETCH COMPANY] No company number in shared state");
        sharedState.put("errorMessage","No company number in shared state.");
        return false;
    }

    var request = new org.forgerock.http.protocol.Request();
    request.setMethod('GET');
    var searchTerm = "?_queryFilter=number+eq+%22" + companyNumber + "%22";
    request.setUri(idmCompanyEndpoint + searchTerm);
    request.getHeaders().add("Authorization", "Bearer " + idmToken);
    request.getHeaders().add("Content-Type", "application/json");

    var response = httpClient.send(request).get();

    logResponse(response);

    if (response.getStatus().getCode() === 200) {
        logger.error("[FETCH COMPANY] 200 response from IDM");
        var companyResponse = JSON.parse(response.getEntity().getString());

        if (companyResponse.resultCount > 0) {
            logger.error("[FETCH COMPANY] Got a result: "+JSON.stringify(companyResponse.result[0]));       
            
            var authCode = companyResponse.result[0].authCode;
            logger.error("[FETCH COMPANY] Found authCode: " + authCode);

            if (authCode == null) {
                logger.error("[FETCH COMPANY] No auth code associated with company")
                sharedState.put("errorMessage","No auth code associated with company "+companyNumber+".");
                return false;
            }
            
            sharedState.put("companyData", JSON.stringify(companyResponse.result[0]));
            sharedState.put("hashedCredential", authCode);

            if (callbacks.isEmpty()) {
                action = fr.Action.send(
                    new fr.HiddenValueCallback (
                        "stage",
                        "COMPANY_ASSOCIATION_2" 
                    ),
                    new fr.TextOutputCallback(
                        fr.TextOutputCallback.INFORMATION,
                        JSON.stringify(companyResponse.result[0])
                    ),
                    new fr.HiddenValueCallback (
                        "pagePropsJSON",
                        JSON.stringify({"company": companyResponse.result[0]}) 
                    ),
                    new fr.ConfirmationCallback(
                        "Do you want to file for this company?",
                        fr.ConfirmationCallback.INFORMATION,
                        ["YES", "NO"],
                        YES_OPTION_INDEX
                    )
                ).build()
            }  
        } else {
            logger.error("[FETCH COMPANY] No company results for company number "+companyNumber);
            sharedState.put("errorMessage","The company " + companyNumber + " could not be found.");
            sharedState.put("createRelationshipErrorType", "COMPANY_NOT_FOUND");
            sharedState.put("createRelationshipErrorField", "IDToken2");
            return false;
        }
    } else if (response.getStatus().getCode() === 401) {
        logger.error("[FETCH COMPANY] Error while retrieving company with ID "+companyNumber);
        sharedState.put("errorMessage","Error while retrieving company "+companyNumber+".");
        return false;
    }
}

// main execution flow
var YES_OPTION_INDEX = 0;
var idmCompanyEndpoint = "https://openam-companieshouse-uk-dev.id.forgerock.io/openidm/managed/Company/";

// if the user has selected to proceed with association or to not go ahead, callbacks will be not empty
if(!callbacks.isEmpty()){
    var selection = callbacks.get(3).getSelectedIndex();
    logger.error("[FETCH COMPANY] selection "+selection);
    if(selection === YES_OPTION_INDEX){
        logger.error("[FETCH COMPANY] selected YES! ");
        sharedState.put("errorMessage",null);
        sharedState.put("createRelationshipErrorType", null);
        sharedState.put("createRelationshipErrorField", null);
        outcome = NodeOutcome.TRUE;   
    }else{
        sharedState.put("errorMessage",null);
        outcome = NodeOutcome.FALSE;   
    }
} else {
    // if the user has started the journey, the callbacks will be empty, then fetch company info    
    var accessToken = fetchIDMToken();
    if (!accessToken) {
        logger.error("[FETCH COMPANY] Access token not in transient state")
        outcome = NodeOutcome.ERROR;
    } else {
        var companyNumber = sharedState.get("companyNumber");
        //fetchCompany can only result in callbacks, does not transition anywhere
        if(!fetchCompany(accessToken, companyNumber)){
            logger.error("[FETCH COMPANY] error while fetching company")
            outcome = NodeOutcome.FALSE;
        }
    }
}