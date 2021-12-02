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
  var request = new org.forgerock.http.protocol.Request();
  var ACCESS_TOKEN_STATE_FIELD = 'idmAccessToken';
  var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);
  if (accessToken == null) {
    _log('Access token not in shared state');
    return false;
  }

  var requestBodyJson = {
    'subjectId': userIdentifier,
    'companyNumber': companyNo
  };

  request.setMethod('POST');
  _log('Check user ' + userIdentifier + 'membership status to company ' + companyNo);
  request.setUri(idmCompanyAuthEndpoint + '?_action=getCompanyStatusByUserId');
  request.getHeaders().add('Authorization', 'Bearer ' + accessToken);
  request.getHeaders().add('Content-Type', 'application/json');
  request.getHeaders().add('Accept-API-Version', 'resource=1.0');
  request.setEntity(requestBodyJson);

  var response = httpClient.send(request).get();

  logResponse(response);
  if (response.getStatus().getCode() === 200) {
    _log('200 response from IDM');
    var membershipResponse = JSON.parse(response.getEntity().getString());
    return membershipResponse;
  } else {
    _log('Error during relationship creation');
    return false;
  }
}

//extracts the language form headers (default to EN)
function getSelectedLanguage (requestHeaders) {
  if (requestHeaders && requestHeaders.get('Chosen-Language')) {
    var lang = requestHeaders.get('Chosen-Language').get(0);
    _log('selected language: ' + lang);
    return lang;
  }
  _log('no selected language found - defaulting to EN');
  return 'EN';
}

try {
  var idmCompanyAuthEndpoint = 'https://openam-companieshouse-uk-dev.id.forgerock.io/openidm/endpoint/companyauth/';
  var companyNo = JSON.parse(sharedState.get('companyData')).number;
  var sessionOwner = sharedState.get('_id');
  _log('[EWF - CHECK COMPANY MEMBERSHIP] session owner: ' + sessionOwner);
  var language = getSelectedLanguage(requestHeaders);

  var companyMembership = getUserMembershipForCompany(sessionOwner, companyNo);
  if (!companyMembership) {
    _log('Error while invoking endpoint');
    outcome = NodeOutcome.ERROR;
  } else {
    if (companyMembership.company.status !== MembershipStatus.CONFIRMED) {
      _log('User not associated with company! Current status: ' + companyMembership.company.status);
      action = fr.Action.goTo(NodeOutcome.USER_NOT_ASSOCIATED)
        .build();
    } else {
      _log('User already associated with company!');
      action = fr.Action.goTo(NodeOutcome.USER_ASSOCIATED)
        .putSessionProperty('authCode', JSON.parse(sharedState.get('companyData')).authCode)
        .putSessionProperty('language', language.toLowerCase())
        .build();
    }
  }
} catch (e) {
  _log('Error ' + e);
  sharedState.put('errorMessage', e.toString());
  outcome = NodeOutcome.ERROR;
}

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END