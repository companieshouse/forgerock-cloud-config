var _scriptName = 'CH WEBFILING CHECK FOR COMPANY ASSOC STATUS';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.NameCallback,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
);

var MembershipStatus = {
  CONFIRMED: 'confirmed',
  PENDING: 'pending',
  NONE: 'none'
};

var NodeOutcome = {
  USER_ASSOCIATED: 'user_associated',
  USER_NOT_ASSOCIATED: 'user_not_associated',
  ERROR: 'error'
};

function logResponse (response) {
  _log('Scripted Node HTTP Response: ' + response.getStatus() + ', Body: ' + response.getEntity().getString());
}

// extracts the user membership status to the given company. User could be provided as a user ID or a username (email) 
function getUserMembershipForCompany (userIdentifier, companyNo) {
  try{
    var request = new org.forgerock.http.protocol.Request();
    var ACCESS_TOKEN_STATE_FIELD = 'idmAccessToken';
    var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);
    if (accessToken == null) {
      _log('[GET USER MEMBERSHIP] Access token not in shared state');
      return false;
    }

    var requestBodyJson = {
      'subjectId': userIdentifier,
      'companyNumber': companyNo
    };

    request.setMethod('POST');
    _log('[GET USER MEMBERSHIP] Check user ' + userIdentifier + 'membership status to company ' + companyNo,  'MESSAGE');
    _log('[GET USER MEMBERSHIP] Calling ' + idmCompanyAuthEndpoint + '?_action=getCompanyStatusByUserId');
    request.setUri(idmCompanyAuthEndpoint + '?_action=getCompanyStatusByUserId');
    request.getHeaders().add('Authorization', 'Bearer ' + accessToken);
    request.getHeaders().add('Content-Type', 'application/json');
    request.getHeaders().add('Accept-API-Version', 'resource=1.0');
    request.setEntity(requestBodyJson);

    var response = httpClient.send(request).get();

    logResponse(response);
    if (response.getStatus().getCode() === 200) {
      var membershipResponse = JSON.parse(response.getEntity().getString());
      return membershipResponse;
    } else {
      _log('[GET USER MEMBERSHIP] Error during relationship creation');
      return false;
    }
  } catch(e){
    _log('[GET USER MEMBERSHIP] Exception during relationship creation ' + e);
    return false;
  }
}

try {
  var idmCompanyAuthEndpoint = _fromConfig('FIDC_ENDPOINT') + '/openidm/endpoint/companyauth/';
  var companyNo = JSON.parse(sharedState.get('companyData')).number;
  var sessionOwner = sharedState.get('_id');
  _log('[TOPLEVEL] Session owner: ' + sessionOwner);
  var language = _getSelectedLanguage(requestHeaders);

  var companyMembership = getUserMembershipForCompany(sessionOwner, companyNo);
  if (!companyMembership) {
    _log('[TOPLEVEL] Error while invoking IDM endpoint to get Company membership');
    outcome = NodeOutcome.ERROR;
  } else {
    if (companyMembership.company.status !== MembershipStatus.CONFIRMED) {
      _log('[TOPLEVEL] User not associated with company! Current status: ' + companyMembership.company.status);

      outcome = NodeOutcome.USER_NOT_ASSOCIATED;

      action = fr.Action.goTo(NodeOutcome.USER_NOT_ASSOCIATED)
        .build();
    } else {
      _log('[TOPLEVEL] User already associated with company!');
      var useAuthCode = JSON.parse(sharedState.get('companyData')).authCode;

      outcome = NodeOutcome.USER_ASSOCIATED;

      action = fr.Action.goTo(NodeOutcome.USER_ASSOCIATED)
        .putSessionProperty('authCode', useAuthCode)
        .putSessionProperty('language', language.toLowerCase())
        .build();
    }
  }
} catch (e) {
  _log('[TOPLEVEL] Error ' + e.toString());
  sharedState.put('errorMessage', e.toString());
  outcome = NodeOutcome.ERROR;
}

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END