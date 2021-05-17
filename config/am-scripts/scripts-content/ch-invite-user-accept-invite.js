/* 
  ** INPUT DATA
    * QUERY PARAMETERS
      - 'action': the desired action for the company invite: accept, reject, send (implicit)
    
    * SHARED STATE:
      - 'companyData' : the company data which has been fetched
      - '_id': session owner ID
      - 'invitedEmail': the invitee email address

    * TRANSIENT STATE
      - 'idmAccessToken': the IDM access token

  ** OUTPUT DATA
   
    * SHARED STATE:
      - 'errorMessage': the error message to be displayed
      - 'pagePropsJSON': the JSON props for the UI

  ** OUTCOMES
    - skip_accept_invite: skip the invite/reject logic, and proceed to sending the invite
    - error: an error occurred
  
  ** CALLBACKS: 
    - output: confirmation of executed action
    - output: stage name and page props for UI
*/

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
)

var NodeOutcome = {
  SKIP_ACCEPT: "skip_accept_invite",
  ERROR: "error"
}

var InviteActions = {
  ACCEPT: "accept",
  DECLINE: "decline"
}

function fetchActionParameter() {
  var action = requestParameters.get("action");
  if (!action) {
    logger.error("[INVITE USER - ACCEPT INVITE] No invite action found in request");
    return false;
  } else {
    if (!action.get(0) === 'accept' && !action.get(0) === 'decline') {
      logger.error("[INVITE USER - ACCEPT INVITE] Unsupported action found in request: " + action.get(0));
    }
  }
  logger.error("[INVITE USER - ACCEPT INVITE] Invite action found in request: " + action.get(0));
  return action.get(0);
}


function acceptInvite(callerId, company) {
  var request = new org.forgerock.http.protocol.Request();
  var ACCESS_TOKEN_STATE_FIELD = "idmAccessToken";
  var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);
  var companyNo = JSON.parse(company).number;
  if (accessToken == null) {
    logger.error("[INVITE USER - ACCEPT INVITE] Access token not in shared state");
    return NodeOutcome.ERROR;
  }

  var requestBodyJson =
  {
    "action": InviteActions.ACCEPT,
    "callerId": callerId,
    "subjectId": callerId,
    "companyNumber": companyNo
  }

  request.setMethod('POST');
  logger.error("[INVITE USER - ACCEPT INVITE] Adding user " + callerId + " to company " + companyNo + " with status " + status);
  request.setUri(idmCompanyAuthEndpoint + "?_action=respondToInvite");
  request.getHeaders().add("Authorization", "Bearer " + accessToken);
  request.getHeaders().add("Content-Type", "application/json");
  request.getHeaders().add("Accept-API-Version", "resource=1.0");
  request.setEntity(requestBodyJson);

  var response = httpClient.send(request).get();

  logResponse(response);
  if (response.getStatus().getCode() === 200) {
    logger.error("[INVITE USER - ACCEPT INVITE] 200 response from IDM");
    var membershipResponse = JSON.parse(response.getEntity().getString());
    return membershipResponse.status;
  } else {
    logger.error("[INVITE USER - ACCEPT INVITE] Error during relationship creation");
    return false;
  }
}

// main execution flow
try {
  var idmCompanyAuthEndpoint = "https://openam-companieshouse-uk-dev.id.forgerock.io/openidm/endpoint/companyauth/";
  var actionParam = fetchActionParameter();
  // if there is no 'action' parameter or the 'action' parameter is set to 'send', skip the accept/reject logic, and proceed to sending the invite
  if (!actionParam || actionParam === 'send') {
    outcome = NodeOutcome.SKIP_ACCEPT;
  } else {
    var companyData = sharedState.get("companyData");
    var invitedEmail = sharedState.get("email");
    var userId = sharedState.get("_id");
    if (actionParam === 'accept') {
      var acceptResponse = acceptInvite(userId, company);
      if (!acceptResponse) {
        logger.error("[INVITE USER - ACCEPT INVITE] Error while setting relationship status to confirmed");
      } else {
        var infoMessage = "The You are now authorised to file for " + JSON.parse(companyData).name + ". This company has been added to your account.";
        if (callbacks.isEmpty()) {
          action = fr.Action.send(
            new fr.TextOutputCallback(
              fr.TextOutputCallback.INFORMATION,
              infoMessage
            ),
            new fr.HiddenValueCallback(
              "stage",
              "INVITE_USER_3"
            ),
            new fr.HiddenValueCallback(
              "pagePropsJSON",
              JSON.stringify({ "company": JSON.parse(companyData) })
            )
          ).build()
        }
      }
    } else if (actionParam === 'decline') {
      // TODOååå
    }

  }
} catch (e) {
  logger.error("[INVITE USER - ACCEPT INVITE] Error " + e);
}