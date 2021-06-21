/* 
  ** INPUT DATA
    * SHARED STATE:
      - 'companyData': the company data which has been previously looked up from IDM
      - '_id': id of the current user (session owner)
      - 'email': email of the invited user
      - [optional] 'errorMessage': error message to display from previous attempts
    
    * TRANSIENT STATE
      - 'idmAccessToken': the IDM access token

  ** OUTPUT DATA
    * SHARED STATE:
      - 'inviterName': the full name of the inviter (or email of name is not set)
      - 'invitedName': the full name of the invited (or email of name is not set)
      - 'errorMessage': the error message to be displayed
      - 'pagePropsJSON': the JSON props for the UI

  ** OUTCOMES
    - 'success'': user relationship set correctly
    - 'unauthroized': and authZ error happened while setting the relationship between user and company
    - 'error': an error occurred 
  
*/

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.NameCallback,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
)

var MembershipStatus = {
  CONFIRMED: "confirmed",
  PENDING: "pending",
  NONE: "none"
}

var NodeOutcome = {
  SUCCESS: "success",
  AUTHZ_ERROR: "unauthorized",
  ERROR: "error"
}

var IdentifierType = {
  USERID: "USERID",
  USERNAME: "USERNAME"
}

function logResponse(response) {
  logger.error("[INVITE - ADD RELATIONSHIP] Scripted Node HTTP Response: " + response.getStatus() + ", Body: " + response.getEntity().getString());
}

// extracts the user membership status to the given company. User could be provided as a user ID or a username (email) 
function getUserMembershipForCompany(userIdentifier, company, idType) {
  var request = new org.forgerock.http.protocol.Request();
  var ACCESS_TOKEN_STATE_FIELD = "idmAccessToken";
  var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);
  var companyNo = JSON.parse(company).number;
  if (accessToken == null) {
    logger.error("[INVITE USER CHECK MEMBERSHIP] Access token not in shared state");
    return NodeOutcome.ERROR;
  }

  var requestBodyJson = (idType === IdentifierType.USERID) ?
    {
      "userId": userIdentifier,
      "companyNumber": companyNo
    } :
    {
      "userName": userIdentifier,
      "companyNumber": companyNo
    };

  request.setMethod('POST');
  logger.error("[INVITE USER CHECK MEMBERSHIP] Check user " + userIdentifier + "membership status to company " + companyNo);
  var endpointName = (idType === IdentifierType.USERID) ? "getCompanyStatusByUserId" : "getCompanyStatusByUsername";
  request.setUri(idmCompanyAuthEndpoint + "?_action=" + endpointName);
  request.getHeaders().add("Authorization", "Bearer " + accessToken);
  request.getHeaders().add("Content-Type", "application/json");
  request.getHeaders().add("Accept-API-Version", "resource=1.0");
  request.setEntity(requestBodyJson);

  var response = httpClient.send(request).get();

  logResponse(response);
  if (response.getStatus().getCode() === 200) {
    logger.error("[INVITE USER CHECK MEMBERSHIP] 200 response from IDM");
    var membershipResponse = JSON.parse(response.getEntity().getString());
    return membershipResponse;
  }
  else {
    logger.error("[INVITE USER CHECK MEMBERSHIP] Error during relationship creation");
    return false;
  }
}

function createPendingRelationship(callerId, userName, company) {
  var request = new org.forgerock.http.protocol.Request();
  var ACCESS_TOKEN_STATE_FIELD = "idmAccessToken";
  var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);
  var companyNo = JSON.parse(company).number;
  if (accessToken == null) {
    logger.error("[INVITE USER CHECK MEMBERSHIP] Access token not in shared state");
    return NodeOutcome.ERROR;
  }

  var requestBodyJson =
  {
    "callerId": callerId,
    "subjectUserName": userName,
    "companyNumber": companyNo
  }

  request.setMethod('POST');
  logger.error("[INVITE USER ADD MEMBERSHIP] Creating PENDING relationship between user " + userName + " and company " + companyNo);
  request.setUri(idmCompanyAuthEndpoint + "?_action=inviteUserByUsername");
  request.getHeaders().add("Authorization", "Bearer " + accessToken);
  request.getHeaders().add("Content-Type", "application/json");
  request.getHeaders().add("Accept-API-Version", "resource=1.0");
  request.setEntity(requestBodyJson);

  var response = httpClient.send(request).get();

  logResponse(response);
  var membershipResponse = JSON.parse(response.getEntity().getString());
  if (response.getStatus().getCode() === 200) {
    logger.error("[INVITE USER CHECK MEMBERSHIP] 200 response from IDM");
    return {
      success: membershipResponse.success
    }
  }
  else {
    logger.error("[INVITE USER CHECK MEMBERSHIP] Error during relationship creation");
    return {
      success: false,
      message: membershipResponse.detail.reason
    };
  }
}

function performAuthzCheck(inviterUserId, invitedEmail, companyData) {
  var inviterMembership = getUserMembershipForCompany(inviterUserId, companyData, IdentifierType.USERID);
  if (!inviterMembership) {
    logger.error("[INVITE USER CHECK MEMBERSHIP] Error while invoking endpoint");
    return false;
  }
  //store the subject username in shared state
  sharedState.put("inviterName", inviterMembership.subject.fullName || inviterMembership.subject.userName);
  logger.error("[INVITE USER CHECK MEMBERSHIP] Inviter membership to company: " + JSON.stringify(inviterMembership));
  // check whether the caller (user owning the session in which the inviter journey has been started) is already authorised for the company
  if (inviterMembership.company.status !== MembershipStatus.CONFIRMED) {
    logger.error("[INVITE USER CHECK MEMBERSHIP] The Inviter is not authorised for the company!");
    sharedState.put("errorMessage", "You are not authorised for Company ''" + JSON.parse(companyData).name + "'");
    sharedState.put("pagePropsJSON", JSON.stringify(
      {
        'errors': [{
          label: "You are not authorised for Company ''" + JSON.parse(companyData).name + "'",
          token: "INVITE_USER_INVITER_NOT_AUTHZ_ERROR",
          fieldName: "IDToken2",
          anchor: "IDToken2"
        }],
        'company': { number: JSON.parse(companyData).number }
      }));
    return false;
  }

  // check whether the invited user has no relationship with the company
  var invitedMembership = getUserMembershipForCompany(invitedEmail, companyData, IdentifierType.USERNAME);
  if (!invitedMembership) {
    logger.error("[INVITE USER CHECK MEMBERSHIP] Error while invoking endpoint");
    return false;
  }
  sharedState.put("invitedName", invitedMembership.subject.fullName || invitedMembership.subject.userName);
  logger.error("[INVITE USER CHECK MEMBERSHIP] Invited membership to company: " + invitedMembership);
  if (invitedMembership.company.status === MembershipStatus.CONFIRMED) {
    logger.error("[INVITE USER CHECK MEMBERSHIP] The Invited user must be not already authorised in order to be invited.");
    sharedState.put("errorMessage", "The Invited user must be not already authorised in order to be invited.");
    sharedState.put("pagePropsJSON", JSON.stringify(
      {
        'errors': [{
          label: "The Invited user must be not already authorised in order to be invited.",
          token: "INVITE_USER_INVITED_USER_ALREADY_ASSOCIATED_ERROR",
          fieldName: "IDToken2",
          anchor: "IDToken2"
        }],
        'company': { membershipStatus: invitedMembership }
      }));
    return false;
  }
  return true;
}

// main execution flow

try {
  var idmCompanyAuthEndpoint = "https://openam-companieshouse-uk-dev.id.forgerock.io/openidm/endpoint/companyauth/";
  var companyData = sharedState.get("companyData");
  logger.error("[INVITE USER CHECK MEMBERSHIP] company data: " + companyData);
  var inviterUserId = sharedState.get("_id");
  var invitedEmail = sharedState.get("email");

  if (!performAuthzCheck(inviterUserId, invitedEmail, companyData)) {
    outcome = NodeOutcome.AUTHZ_ERROR;
  } else {
    var inviteUserResult = createPendingRelationship(inviterUserId, invitedEmail, companyData);
    if (!inviteUserResult.success) {
      sharedState.put("errorMessage", "Could not invite the user " + invitedEmail + " to Company ''" + JSON.parse(companyData).name + "': "+inviteUserResult.message);
      sharedState.put("pagePropsJSON", JSON.stringify(
        {
          'errors': [{
            label: "Could not invite the user " + invitedEmail + " to Company ''" + JSON.parse(companyData).name + "': "+inviteUserResult.message,
            token: "INVITE_USER_ADD_USER_TO_COMPANY_ERROR",
            fieldName: "IDToken2",
            anchor: "IDToken2"
          }],
          'company': { name: JSON.parse(companyData).name }
        }));
      outcome = NodeOutcome.AUTHZ_ERROR;
    } else {
      outcome = NodeOutcome.SUCCESS;
    }
  }
} catch (e) {
  logger.error("[INVITE USER CHECK MEMBERSHIP] error " + e)
  outcome = NodeOutcome.ERROR;
}