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
    - skip_respond_invite: skip the responding logic, and proceed to sending the invite
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
  SKIP_RESPOND: "skip_respond_invite",
  ERROR: "error"
}

var InviteActions = {
  ACCEPT: "accept",
  DECLINE: "decline",
  SEND: "send"
}

function fetchActionParameter() {
  var action = requestParameters.get("action");
  if (!action) {
    logger.error("[INVITE USER - ACCEPT INVITE] No invite action found in request");
    return false;
  } else {
    if (!action.get(0).equals("accept") && !action.get(0).equals("decline")) {
      logger.error("[INVITE USER - ACCEPT INVITE] Unsupported action found in request: " + action.get(0));
      return "error"
    }
  }
  logger.error("[INVITE USER - ACCEPT INVITE] Invite action found in request: " + action.get(0));
  return action.get(0);
}

function logResponse(response) {
  logger.error("[INVITE USER - ACCEPT INVITE] Scripted Node HTTP Response: " + response.getStatus() + ", Body: " + response.getEntity().getString());
}

// responds to the invite
function respondToInvite(callerId, company, action) {
  logger.error("[INVITE USER - RESPOND INVITE] Processing action " + action + " for user " + callerId + " and company " + companyNo);
  var request = new org.forgerock.http.protocol.Request();
  var ACCESS_TOKEN_STATE_FIELD = "idmAccessToken";
  var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);
  var companyNo = JSON.parse(company).number;
  if (accessToken == null) {
    logger.error("[INVITE USER - RESPOND INVITE] Access token not in transient state");
    return NodeOutcome.ERROR;
  }

  var requestBodyJson =
  {
    "action": action,
    "callerId": callerId,
    "subjectId": callerId,
    "companyNumber": companyNo
  }

  request.setMethod('POST');

  request.setUri(idmCompanyAuthEndpoint + "?_action=respondToInvite");
  request.getHeaders().add("Authorization", "Bearer " + accessToken);
  request.getHeaders().add("Content-Type", "application/json");
  request.getHeaders().add("Accept-API-Version", "resource=1.0");
  request.setEntity(requestBodyJson);

  var response = httpClient.send(request).get();
  var actionResponse = JSON.parse(response.getEntity().getString());
  logResponse(response);
  if (response.getStatus().getCode() === 200) { 
    logger.error("[INVITE USER - ACCEPT INVITE] 200 response from IDM");
    return {
      success: actionResponse.success
    }
  } else {
    logger.error("[INVITE USER - ACCEPT INVITE] Error during action processing");
    return {
      success: false,
      message: actionResponse.detail.reason
    };
  }
}

//raises a generic registration error
function sendErrorCallbacks(stage, token, message) {
  if (callbacks.isEmpty()) {
    action = fr.Action.send(
      new fr.HiddenValueCallback(
        "stage",
        stage
      ),
      new fr.TextOutputCallback(
        fr.TextOutputCallback.ERROR,
        message
      ),
      new fr.HiddenValueCallback(
        "pagePropsJSON",
        JSON.stringify({ 'errors': [{ label: message, token: token }] })
      )
    ).build()
  }
}

// main execution flow
try {
  var idmCompanyAuthEndpoint = "https://openam-companieshouse-uk-dev.id.forgerock.io/openidm/endpoint/companyauth/";
  var actionParam = fetchActionParameter();
  var companyData = sharedState.get("companyData");
  var invitedEmail = sharedState.get("email");
  var userId = sharedState.get("_id");
  // if there is no 'action' parameter or the 'action' parameter is set to 'send', skip the accept/reject logic, and proceed to sending the invite
  if (!actionParam || actionParam === InviteActions.SEND) {
    logger.error("[INVITE USER - ACCEPT INVITE] Skip invite response processing");
    outcome = NodeOutcome.SKIP_RESPOND;
  } else if (actionParam === "error") {
    sendErrorCallbacks("INVITE_USER_ERROR", "INVITE_USER_UNKNOWN_ACTION_ERROR", "Unsupported action found in request");
  } else {
    if (actionParam === InviteActions.ACCEPT) {
      var acceptResponse = respondToInvite(userId, companyData, InviteActions.ACCEPT);
      if (!acceptResponse.success) {
        logger.error("[INVITE USER - ACCEPT INVITE] Error while setting relationship status to confirmed");
        sendErrorCallbacks("INVITE_USER_ERROR", "INVITE_USER_ACCEPT_INVITE_ERROR", acceptResponse.message);
      } else {
        var infoMessage = "You are now authorised to file for "
          .concat(JSON.parse(companyData).name)
          .concat(". This company has been added to your account.");
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
    } else if (actionParam === InviteActions.DECLINE) {
      var declineResponse = respondToInvite(userId, companyData, InviteActions.DECLINE);
      if (!declineResponse.success) {
        logger.error("[INVITE USER - DECLINE INVITE] Error while removing relationship");
        sendErrorCallbacks("INVITE_USER_ERROR", "INVITE_USER_DECLINE_INVITE_ERROR", declineResponse.message);
      } else {
        var infoMessage = "You have declined the request to have authorisation to file online for "
          .concat(JSON.parse(companyData).name)
          .concat(".");
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
    }

  }
} catch (e) {
  logger.error("[INVITE USER - RESPOND INVITE] Error " + e);
  sharedState.put("errorMessage", e.toString());
  outcome = NodeOutcome.ERROR;
}