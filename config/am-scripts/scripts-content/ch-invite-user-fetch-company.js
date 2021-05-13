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
    - input: invited full name, invited email address 
    - output: prompt to enter company no, or error message (if any)
    - output: stage name and page props for UI
*/

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
)

var NodeOutcome = {
  SUCCESS: "success",
  ERROR: "error"
}

function fetchCompanyParameter() {
  var companyNo = requestParameters.get("companyNumber");
  if (!companyNo) {
    var errorMessage = "Enter a username and password.";
    var errorProps = JSON.stringify(
      {
        'errors': [{
          label: "No Company Number found in request.",
          token: "INVITE_USER_NO_INPUT_COMPANY_FOUND_ERROR"
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
    return companyNo.get(0);
  }
}

// gets company information
function getCompanyInfo(userId, companyNo) {
  var idmCompanyAuthEndpoint = "https://openam-companieshouse-uk-dev.id.forgerock.io/openidm/endpoint/companyauth/";
  var request = new org.forgerock.http.protocol.Request();
  var ACCESS_TOKEN_STATE_FIELD = "idmAccessToken";
  var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);
  if (accessToken == null) {
    logger.error("[INVITE USER CHECK MEMBERSHIP] Access token not in shared state");
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
    return companyResponse.company;
  }
  else {
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
}

try{
// main execution flow
var companyNumber = fetchCompanyParameter();
var sessionOwner = sharedState.get("_id");
var companyData = getCompanyInfo(sessionOwner, companyNumber);
sharedState.put("companyData", JSON.stringify(companyData));

outcome = NodeOutcome.SUCCESS
}catch(e){
  logger.error("[INVITE USER - GET COMPANY DETAILS] Error " + e);
}