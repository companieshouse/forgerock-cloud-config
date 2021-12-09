var _scriptName = 'CH INVITE USER PREPARE USER ONBOARDING';
_log('Starting');

/* 
  ** INPUT DATA
    * SHARED STATE:
      - 'companyData': the company data which has been previously looked up from IDM
      - '_id': id of the current user (session owner)
      - 'email': email of the invited user
      - 'inviterName': the full name of the inviter (or email of name is not set)

    * TRANSIENT STATE
      - 'idmAccessToken': the IDM access token

  ** OUTPUT DATA
    * SHARED STATE
     - isOnboarding: a boolean indicating the user needs to be sent to onboarding journey
    
  ** OUTCOMES
    - success: user created successfully (if needed)
    - error: an error occurred

  ** CALLBACKS:
    - error while sending 
    - generic error
*/

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
);

var NodeOutcome = {
  SUCCESS: 'success',
  ERROR: 'error'
};

var invitedEmail = sharedState.get('email');
var inviterName = sharedState.get('inviterName');

function formatDate () {
  var date = new Date();
  var result = [];
  result.push(date.getFullYear());
  result.push(padding(date.getMonth() + 1));
  result.push(padding(date.getDate()));
  result.push(padding(date.getHours()));
  result.push(padding(date.getMinutes()));
  result.push(padding(date.getSeconds()));
  result.push('Z');
  return result.join('');
}

function padding (num) {
  return num < 10 ? '0' + num : num;
}

function logResponse (response) {
  _log('Scripted Node HTTP Response: ' + response.getStatus() + ', Body: ' + response.getEntity().getString());
}

//checks whether the user with the given email already exists in IDM
function checkUserExistence (email) {
  try {
    var idmUserEndpoint = FIDC_ENDPOINT.concat('/openidm/managed/alpha_user?_queryFilter=userName+eq+%22' + email + '%22');
    var request = new org.forgerock.http.protocol.Request();
    var accessToken = fetchIDMToken();
    if (!accessToken) {
      action = fr.Action.goTo(NodeOutcome.ERROR).build();
    }

    request.setMethod('GET');
    request.setUri(idmUserEndpoint);
    request.getHeaders().add('Authorization', 'Bearer ' + accessToken);
    request.getHeaders().add('Content-Type', 'application/json');
    request.getHeaders().add('Accept-API-Version', 'resource=1.0');

    var response = httpClient.send(request).get();

    logResponse(response);

    if (response.getStatus().getCode() === 200) {
      var searchResponse = JSON.parse(response.getEntity().getString());
      if (searchResponse && searchResponse.result && searchResponse.result.length > 0) {
        _log('user found: ' + searchResponse.result[0].toString());
        return true;
      } else {
        _log('user NOT found: ' + email);
        return false;
      }
    } else {
      _log('Error while checking user existence: ' + response.getStatus().getCode());
      return NodeOutcome.ERROR;
    }
  } catch (e) {
    _log(e);
    return NodeOutcome.ERROR;
  }
}

//fetches the IDM access token from transient state
function fetchIDMToken () {
  var ACCESS_TOKEN_STATE_FIELD = 'idmAccessToken';
  var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);
  if (accessToken == null) {
    _log('Access token not in transient state');
    return false;
  }
  return accessToken;
}

//creates a new user given an email address
function createUser (invitedEmail) {
  try {
    var idmUserEndpoint = FIDC_ENDPOINT.concat('/openidm/managed/alpha_user?_action=create');
    var request = new org.forgerock.http.protocol.Request();
    var accessToken = fetchIDMToken();
    var onboardingDate = formatDate();
    if (!accessToken) {
      action = fr.Action.goTo(NodeOutcome.ERROR).build();
    }

    var requestBodyJson =
      {
        'userName': invitedEmail,
        'sn': invitedEmail,
        'mail': invitedEmail,
        'frIndexedDate2': onboardingDate
      };

    request.setMethod('POST');
    request.setUri(idmUserEndpoint);
    request.getHeaders().add('Authorization', 'Bearer ' + accessToken);
    request.getHeaders().add('Content-Type', 'application/json');
    request.getHeaders().add('Accept-API-Version', 'resource=1.0');
    request.setEntity(requestBodyJson);

    var response = httpClient.send(request).get();

    logResponse(response);

    if (response.getStatus().getCode() === 201) {
      _log('201 response from IDM');
      return true;
    } else {
      _log('Error during user creation');
      return false;
    }
  } catch (e) {
    _log(e);
  }

}

//main execution flow
try {
  var FIDC_ENDPOINT = _fromConfig('FIDC_ENDPOINT');
  var onboardingDate = formatDate();
  _log('Setting onboarding date to ' + onboardingDate);

  var userExists = checkUserExistence(invitedEmail);
  if (userExists === NodeOutcome.ERROR) {
    _log('check existence');
    action = fr.Action.goTo(NodeOutcome.ERROR).build();
  } else if (!userExists) {
    if (!createUser(invitedEmail)) {
      action = fr.Action.goTo(NodeOutcome.ERROR).build();
    } else {
      sharedState.put('isOnboarding', true);
      action = fr.Action.goTo(NodeOutcome.SUCCESS).build();
    }
  } else {
    action = fr.Action.goTo(NodeOutcome.SUCCESS).build();
  }
} catch (e) {
  _log(e);
  sharedState.put('errorMessage', e.toString());
  action = fr.Action.goTo(NodeOutcome.ERROR).build();
}

// LIBRARY START
// LIBRARY END