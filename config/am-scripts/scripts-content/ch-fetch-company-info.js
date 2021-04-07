/* 
  ** INPUT DATA
    * SHARED STATE:
    - 'companyNumber' : the company number we need to lookup 
    * TRANSIENT STATE
    - 'idmAccessToken' : the IDM Access Token, which can be obtained by executing a scripted decision node configured with the script 'CH - Get IDM Access Token'

  ** OUTPUT DATA
    * SHARED STATE:
    - 'companyData': the company data, result of the lookup

  ** OUTCOMES
    - true: lookup successful
    - false: error during lookup
  
  ** CALLBACKS:
    - Error - company number not found
*/

var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback
)

var ACCESS_TOKEN_STATE_FIELD = "idmAccessToken";
var idmCompanyEndpoint = "https://openam-companieshouse-uk-dev.id.forgerock.io/openidm/managed/Company/";

var NodeOutcome = {
    TRUE: "true",
    FALSE: "false"
}

function logResponse(response) {
    logger.error("[FETCH COMPANY] Scripted Node HTTP Response: " + response.getStatus() + ", Body: " + response.getEntity().getString());
}

// fetch the Company object given a company number
function fetchCompany(companyNumber) {
    if (companyNumber == null) {
        logger.error("[FETCH COMPANY] No company number in shared state");
        return NodeOutcome.FALSE;
    }

    var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);
    if (accessToken == null) {
      logger.error("[FETCH COMPANY] Access token not in shared state")
      return NodeOutcome.FALSE;
    }

    var request = new org.forgerock.http.protocol.Request();
    request.setMethod('GET');
    var searchTerm = "?_queryFilter=number+eq+%22" + companyNumber + "%22";
    request.setUri(idmCompanyEndpoint + searchTerm);
    request.getHeaders().add("Authorization", "Bearer " + accessToken);
    request.getHeaders().add("Content-Type", "application/json");

    var response = httpClient.send(request).get();

    logResponse(response);

    if (response.getStatus().getCode() === 200) {
        logger.error("[FETCH COMPANY] 200 response from IDM");
        var companyResponse = JSON.parse(response.getEntity().getString());

        if (companyResponse.resultCount > 0) {
            logger.error("[FETCH COMPANY] Got a result");       
            sharedState.put("companyData", JSON.stringify(companyResponse.result[0]));
            return NodeOutcome.TRUE;
        } else {
            logger.error("[FETCH COMPANY] No company results for company number "+companyNumber)
            if (callbacks.isEmpty()) {
                action = fr.Action.send(
                    new fr.HiddenValueCallback (
                        "stage",
                        "COMPANY_NOT_FOUND" 
                    ),
                      new fr.TextOutputCallback(
                        fr.TextOutputCallback.ERROR,
                        "The company " + companyNumber + " could not be found"
                    ),
                    new fr.HiddenValueCallback (
                        "pagePropsJSON",
                        JSON.stringify({ 'errors': [{ label: "The company " + companyNumber + " could not be found"} ] })
                    )
                ).build()
            }
            //return NodeOutcome.FALSE;
        }
    } else if (response.getStatus().getCode() === 401) {
        logger.error("[FETCH COMPANY] Error while retrieving company with ID "+companyNumber);
        return NodeOutcome.FALSE;
    }
}

// main execution flow
var companyNumber = sharedState.get("companyNumber");

outcome = fetchCompany(companyNumber);
