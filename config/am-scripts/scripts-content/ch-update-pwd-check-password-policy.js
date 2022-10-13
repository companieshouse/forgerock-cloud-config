var _scriptName = 'CH UPDATE PWD CHECK PASSWORD POLICY';
_log('Starting');

var ACCESS_TOKEN_STATE_FIELD = 'idmAccessToken';
var idmEndpoint = _fromConfig('FIDC_ENDPOINT') + '/openidm/policy/managed/alpha_user/*?_action=validateProperty';

var NodeOutcome = {
  PASS: 'pass',
  FAIL: 'fail',
  ERROR: 'error'
};

var VAR_PASSWORD = 'newPassword';

function logResponse (response) {
  _log('Scripted Node HTTP Response: ' + response.getStatus() + ', Body: ' + response.getEntity().getString());
}

function setPolicyErrorMessage (policyResponse) {
  var failedPolicyRequirements = policyResponse.failedPolicyRequirements;

  sharedState.put('errorMessage', 'The new password does not meet the password policy requirements.');
  sharedState.put('pagePropsJSON', JSON.stringify(
    {
      'errors': [{
        label: 'The new password does not meet the password policy requirements.',
        token: 'PWD_POLICY_ERROR',
        fieldName: (isOnboarding || isResetPassword || isRegistration ? 'IDToken2' : 'IDToken3'),
        anchor: (isOnboarding || isResetPassword || isRegistration ? 'IDToken2' : 'IDToken3')
      }],
      'failedPolicies': failedPolicyRequirements
    }));
}

function policyCompliant (userObject, pwd) {
  // _log('Checking password [' + pwd + '] against policy');

  var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);

  if (accessToken == null) {
    _log('[IS POLICY COMPLIANT] Access token not in transient state');
    sharedState.put('errorMessage', 'Access token not in transient state');
    return NodeOutcome.ERROR;
  }

  var request = new org.forgerock.http.protocol.Request();

  var requestBodyJson = {
    'object': userObject,
    'properties': {
      'password': pwd
    }
  };

  request.setMethod('POST');
  request.setUri(idmEndpoint);
  request.getHeaders().add('Authorization', 'Bearer ' + accessToken);
  request.getHeaders().add('Content-Type', 'application/json');
  request.setEntity(requestBodyJson);

  var response = httpClient.send(request).get();

  logResponse(response);

  if (response.getStatus().getCode() === 200) {
    var policyResponse = JSON.parse(response.getEntity().getString());
    if (policyResponse == null) {
      _log('[IS POLICY COMPLIANT] ]No policy result in response');
      sharedState.put('errorMessage', 'No policy result in response');
      return NodeOutcome.ERROR;
    }
    var compliant = policyResponse.result;
    if (compliant) {
      _log('[IS POLICY COMPLIANT] Password compliant with policy');
      sharedState.put('errorMessage', null);
      sharedState.put('pagePropsJSON', null);
      //transientState.put("newPassword", newPassword);
      return NodeOutcome.PASS;
    } else {
      _log('[IS POLICY COMPLIANT] Password not compliant with policy');
      sharedState.put('errorMessage', 'Password not compliant with policy');
      setPolicyErrorMessage(policyResponse);
      return NodeOutcome.FAIL;
    }
  } else if (response.getStatus().getCode() === 401) {
    _log('[IS POLICY COMPLIANT] Authentication failed for policy lookup');
    sharedState.put('errorMessage', 'Authentication failed for policy lookup');
    return NodeOutcome.ERROR;
  }

  _log('[IS POLICY COMPLIANT] Error');
  sharedState.put('errorMessage', '[CHANGE PWD - POLICY CHECK] Error');

  return NodeOutcome.ERROR;
}

function getUserObject () {
  var ret = {};

  try {
    var activeUserId = _getUserIdFromSharedState();
    var activeUserName = _getUserNameFromSharedState();

    var userData = getUserData(activeUserName, activeUserId);

    if (userData && userData.success && userData.user) {
      _log('GET USER OBJ] Using user object from getUserData()');

      ret.sn = userData.user.sn;
      ret.givenName = userData.user.givenName;
      ret.mail = userData.user.mail;
      ret.userName = userData.user.userName;
    } else {
      if (sharedState.get('objectAttributes')) {
        _log('GET USER OBJ] Using objectAttributes from sharedState');

        ret = sharedState.get('objectAttributes');
      }

    }
  } catch (e) {
    _log('[GET USER OBJ] Error getting user object info ' + e);
  }

  return ret;
}

function getUserData (email, id) {
  try {
    var searchTerm = email ? ('/openidm/managed/alpha_user?_queryFilter=userName+eq+%22' + email + '%22') : '/openidm/managed/alpha_user?_queryFilter=_id+eq+%22' + id + '%22';
    _log('[GET USER DATA] User Search term: ' + searchTerm);

    var idmUserEndpoint = _fromConfig('FIDC_ENDPOINT') + searchTerm;
    var request = new org.forgerock.http.protocol.Request();
    var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);

    if (accessToken == null) {
      _log('[GET USER DATA] Access token not in shared state');
      return {
        success: false,
        message: 'Access token not in shared state'
      };
    }

    request.setMethod('GET');
    request.setUri(idmUserEndpoint);

    request.getHeaders().add('Authorization', 'Bearer ' + accessToken);
    request.getHeaders().add('Content-Type', 'application/json');
    request.getHeaders().add('Accept-API-Version', 'resource=1.0');

    var response = httpClient.send(request).get();

    if (response.getStatus().getCode() === 200) {
      var searchResponse = JSON.parse(response.getEntity().getString());
      if (searchResponse && searchResponse.result && searchResponse.result.length > 0) {
        _log('[GET USER DATA] User found: ' + searchResponse.result[0].toString());
        return {
          success: true,
          user: searchResponse.result[0]
        };
      } else {
        _log('[GET USER DATA] User NOT found: ' + email);
        return {
          success: false,
          message: 'User NOT found: ' + email
        };
      }
    } else {
      _log('[GET USER DATA] Error while checking user existence: ' + response.getStatus().getCode());
      return {
        success: false,
        message: 'Error while checking user existence: ' + response.getStatus().getCode()
      };
    }
  } catch (e) {
    _log('[GET USER DATA] Error : ' + e);
    return {
      success: false,
      message: 'Error: ' + e
    };
  }
}

// Main execution path

var isOnboarding = sharedState.get('isOnboarding');
var isResetPassword = sharedState.get('isResetPassword');
var isRegistration = sharedState.get('isRegistration');

var newPassword = transientState.get(VAR_PASSWORD);

if (newPassword == null) {
  _log('No password in shared state for policy evaluation');
  outcome = NodeOutcome.ERROR;
} else {
  try {
    var userObject = getUserObject();

    outcome = policyCompliant(userObject, newPassword);
  } catch (e) {
    _log('[TOPLEVEL] Error - ' + e);
    sharedState.put('errorMessage', e.toString());
    outcome = NodeOutcome.ERROR;
  }
}

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END