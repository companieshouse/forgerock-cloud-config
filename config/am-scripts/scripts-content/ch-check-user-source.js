var _scriptName = 'CH CREATE-UPDATE USER FROM SOURCE';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  java.lang.Integer
);

var NodeOutcome = {
  SUCCESS: 'success',
  ERROR: 'error'
};

function getUserByEmail (accessToken, email) {
  var searchTerm = '?_queryFilter=userName+eq+%22' + email + '%22';
  return getUserBySearchTerm(accessToken, searchTerm);
}

function getUserByParentUsername (accessToken, parentUsername) {
  var searchTerm = '?_queryFilter=frIndexedString1+eq+%22' + parentUsername + '%22';
  return getUserBySearchTerm(accessToken, searchTerm);
}

// fetches the company by number
function getUserBySearchTerm (accessToken, searchTerm) {
  try {
    var request = new org.forgerock.http.protocol.Request();

    request.setMethod('GET');
    _log('[GET USER] Searching user in IDM with URL: ' + alphaUserUrl + searchTerm);
    request.setUri(alphaUserUrl + searchTerm);

    request.getHeaders().add('Authorization', 'Bearer ' + accessToken);
    request.getHeaders().add('Content-Type', 'application/json');

    var response = httpClient.send(request).get();

    if (response.getStatus().getCode() === 200) {
      var userResponse = JSON.parse(response.getEntity().getString());

      if (userResponse.resultCount > 0) {
        var userData = userResponse.result[0];

        _log('[GET USER] User found in IDM: ' + JSON.stringify(userData));
        return {
          success: true,
          userData: userData
        };
      } else {
        return {
          success: false,
          reason: 'NO_RESULTS'
        };
      }
    } else {
      return {
        success: false,
        reason: 'ERROR'
      };
    }
  } catch (e) {
    _log('[GET USER] Exception while getting user: ' + e);
    return {
      success: false,
      reason: 'ERROR'
    };
  }

}

function createPatchItem (fieldName, value) {
  if (!value) {
    return {
      'operation': 'remove',
      'field': '/' + fieldName
    };
  } else return {
    'operation': 'replace',
    'field': '/' + fieldName,
    'value': value
  };
}

function buildUpdateUserPayload (ewfUserResult, existingLegacyPwd) {
  var requestBodyJson;
  if (String(ewfUserResult.data.frIndexedString2) === String(existingLegacyPwd)) {
    _log('UPDATE USER: password unchanged');
    requestBodyJson = [
      createPatchItem('mail', ewfUserResult.data.mail),
      createPatchItem('userName', ewfUserResult.data.mail),
      createPatchItem('sn', ewfUserResult.data.mail),
      createPatchItem('frIndexedString1', ewfUserResult.data.frIndexedString1)
    ];
  } else {
    _log('UPDATE USER: password has changed');
    requestBodyJson = [
      createPatchItem('mail', ewfUserResult.data.mail),
      createPatchItem('userName', ewfUserResult.data.mail),
      createPatchItem('sn', ewfUserResult.data.mail),
      createPatchItem('frIndexedString1', ewfUserResult.data.frIndexedString1),
      createPatchItem('frIndexedString2', ewfUserResult.data.frIndexedString2),
      createPatchItem('frIndexedString3', 'pending'),
      createPatchItem('frIndexedString5', 'webfiling')
    ];
  }
  return requestBodyJson;
}

//creates a user  with the given data, or update it if already exists
function createOrUpdateUser (accessToken, email) {
  try {
    var idmUserResult = getUserByEmail(accessToken, email);
    var ewfUserResult;
    var request = new org.forgerock.http.protocol.Request();
    var requestBodyJson;
    var operation;
    //the user does not exists in IDM
    if (!idmUserResult.success) {
      _log('[SYNC USER] User NOT found in IDM with email ' + email);
      //search user in EWF by email
      ewfUserResult = fetchUserFromEWFByEmail(email);
      //the user exists in EWF
      if (ewfUserResult.success) {
        _log('[SYNC USER] User found in EWF for email ' + email) + ' - Creating user in IDM';
        //check if a user with the same PARENT_USERNAME exist in IDM - if so, we need to update that instead of creating a new user
        var idmUserWithSameParentUsername = getUserByParentUsername(accessToken, ewfUserResult.data.frIndexedString1);

        if (idmUserWithSameParentUsername.success) {
          _log('[SYNC USER] User found in IDM with parent_username ' + ewfUserResult.data.frIndexedString1);
          var userId = idmUserWithSameParentUsername.userData._id;
          operation = 'UPDATE';
          request.setMethod('PATCH');
          request.setUri(alphaUserUrl + userId);
          //if the password hash in EWF is different from the one in FIDC, update it 
          requestBodyJson = buildUpdateUserPayload(ewfUserResult, idmUserWithSameParentUsername.userData.frIndexedString2);
        } else {
          //create user in FIDC with EWF data
          _log('[SYNC USER] User NOT found in IDM with parent_username ' + ewfUserResult.data.frIndexedString1);
          operation = 'CREATE';
          request.setMethod('POST');
          request.setUri(alphaUserUrl + '?_action=create');
          requestBodyJson = {
            mail: ewfUserResult.data.mail,
            userName: ewfUserResult.data.mail,
            sn: ewfUserResult.data.mail,
            frIndexedString1: ewfUserResult.data.frIndexedString1,
            frIndexedString2: ewfUserResult.data.frIndexedString2
          };
        }
      } else {
        //the users does not exist in EWF either
        _log('[SYNC USER] User not found in EWF or IDM for email ' + email);
        return {
          success: false,
          message: 'Cannot find the user FIDC or EWF'
        };
      }
    } else { //the user already exists in IDM
      _log('[SYNC USER] User exists in IDM for email ' + email);
      //the IDM user has a PARENT_USERNAME set
      if (idmUserResult.userData.frIndexedString1) {
        _log('[SYNC USER] User has PARENT_USERNAME set: ' + idmUserResult.userData.frIndexedString1);
        //search user in EWF by PARENT_USERNAME
        ewfUserResult = fetchUserFromEWFByParentUsername(idmUserResult.userData.frIndexedString1);
        if (!ewfUserResult.success) {
          //Edge case: the user with the same email may have a different PARENT_USERNAME in EWF now (e.g. database refresh) - fetch user by email instead
          _log('[SYNC USER] User not found in EWF for PARENT_USERNAME ' + idmUserResult.userData.frIndexedString1);
          ewfUserResult = fetchUserFromEWFByEmail(email);
          if (!ewfUserResult.success) {
            _log('[SYNC USER] User not found in EWF for email ' + email);
            return false;
          }
        }
      } else {
        _log('[SYNC USER] User does not have PARENT_USERNAME set: ' + email);
        //search user in EWF by email
        ewfUserResult = fetchUserFromEWFByEmail(email);
        if (!ewfUserResult.success) {
          _log('[SYNC USER] User not found in EWF for email ' + email);
          return false;
        }
      }

      _log('[SYNC USER] USER in EWF: ' + JSON.stringify(ewfUserResult));
      _log('[SYNC USER] Updating the user in fIDC: ' + email);
      //update user in FIDC
      var userId = idmUserResult.userData._id;
      operation = 'UPDATE';
      request.setMethod('PATCH');
      request.setUri(alphaUserUrl + userId);

      //if the password hash in EWF is different from the one in FIDC, update it 
      requestBodyJson = buildUpdateUserPayload(ewfUserResult, idmUserResult.userData.frIndexedString2);
    }

    _log('[SYNC USER] IDM payload: ' + operation + ' ' + JSON.stringify(requestBodyJson));

    request.getHeaders().add('Authorization', 'Bearer ' + accessToken);
    request.getHeaders().add('Content-Type', 'application/json');
    request.getHeaders().add('Accept-API-Version', 'resource=1.0');
    request.setEntity(requestBodyJson);

    var response = httpClient.send(request).get();
    _log('[SYNC USER] IDM response: ' + response.getStatus().getCode() + ' ' + response.getEntity().getString());

    if (response.getStatus().getCode() === 201 || response.getStatus().getCode() === 200) {

      if (response.getStatus().getCode() === 200){
        _log('[SYNC USER] User Updated from EWF: ' + email);
      }
      if (response.getStatus().getCode() === 201){
        _log('[SYNC USER] User Created from EWF: ' + email);
      }

      return {
        success: true,
        operation: operation,
        userData: JSON.parse(response.getEntity().getString())
      };
    } else {
      _log('[SYNC USER] Error during user creation/update of user ' + email);
      return {
        success: false,
        operation: operation,
        message: JSON.parse(response.getEntity().getString())
      };
    }
  } catch (e) {
    _log('[SYNC USER] TOPLEVEL Exception occurred during user creation/update of user ' + email + ' - ' + e);
  }
}

function fetchUserFromEWFByParentUsername (parentUsername) {
  var searchTerm = '?_queryFilter=_id+eq+%22' + parentUsername + '%22';
  return fetchUserFromEWFBySearchTerm(accessToken, searchTerm);
}

function fetchUserFromEWFByEmail (email) {
  var emailEncoded = encodeURIComponent(email.trim());
  var searchTerm = '?_queryFilter=EMAIL+eq+%22' + emailEncoded + '%22';
  return fetchUserFromEWFBySearchTerm(accessToken, searchTerm);
}

// fetch the Company from the Mongo connector
function fetchUserFromEWFBySearchTerm (accessToken, searchTerm) {

  try {
    if (!searchTerm || searchTerm.trim() === '') {
      return null;
    }

    var request = new org.forgerock.http.protocol.Request();
    request.setMethod('GET');
    request.setUri(SYSTEM_WEBFILING_USER + searchTerm);
    request.getHeaders().add('Authorization', 'Bearer ' + accessToken);
    request.getHeaders().add('Content-Type', 'application/json');
    request.getHeaders().add('Accept-API-Version', 'resource=1.0');
    _log('[SYNC USER FROM EWF] Request to Oracle connector (users): '+ SYSTEM_WEBFILING_USER + searchTerm)
    var httpResp = httpClient.send(request).get();
    _log('[SYNC USER FROM EWF] Response from EWF User connector: Status ' + httpResp.getStatus().getCode() + ' - Response: ' + httpResp.getEntity().getString());
    
    if (httpResp.getStatus().getCode() !== 200) {
      _log('[SYNC USER FROM EWF] Error while fetching EWF User: ' + httpResp.getEntity().getString());
      return {
        success: false,
        message: 'Error in querying the Oracle connector - ' + httpResp.getEntity().getString()
      };
    }

    var response = JSON.parse(httpResp.getEntity().getString());
    if (response.resultCount === 1) {
      _log('[SYNC USER FROM EWF] User found in EWF database - searchTerm = ' + searchTerm);
      if (response.result[0]._id) {

        var data = {
          mail: response.result[0].EMAIL,
          frIndexedString1: response.result[0].PARENT_USERNAME,
          frIndexedString2: response.result[0].PASSWORD
        };
        return {
          success: true,
          data: data
        };
      } else {
        _log('[SYNC USER FROM EWF] _id not found in response from EWF connector');
        return {
          success: false,
          message: ' _id not found in response from EWF connector'
        };
      }
    } else {
      _log('[SYNC USER FROM EWF] No Users found in EWF database for searchTerm ' + + searchTerm);
      return {
        success: false,
        message: 'no results - ' + response.resultCount
      };
    }
  } catch (e) {
    _log('[SYNC USER FROM EWF] Error while fetching user from EWF: ' + e);
    return {
      success: false,
      message: 'Error while fetching user from EWF - ' + e.toString()
    };
  }

  return null;
}

function extractEmailAddressFromState () {
  var username = sharedState.get('username');
  _log('Username (shared state) : ' + username);

  if (!username) {
    username = sharedState.get('objectAttributes').get('mail');
    _log('Username (shared state > objectAttributes.mail) : ' + username);
  }

  return username;
}

// main execution flow
try {
  var ACCESS_TOKEN_STATE_FIELD = 'idmAccessToken';
  var alphaUserUrl = _fromConfig('FIDC_ENDPOINT') + '/openidm/managed/alpha_user/';
  var SYSTEM_WEBFILING_USER = _fromConfig('FIDC_ENDPOINT') + '/openidm/system/WebfilingUser/webfilingUser';
  var username = extractEmailAddressFromState();

  _log('[SYNC USER] Using username : ' + username);

  var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);

  if (!accessToken || !username) {
    _log('[SYNC USER] Access token or user email not in shared state');
    action = fr.Action.goTo(NodeOutcome.ERROR).build();
  } else {

    var result = createOrUpdateUser(accessToken, username);

    if (!result) {
      _log('[SYNC USER] User creation/update from source failed - proceeding to login with existing IDM credentials');
      action = fr.Action.goTo(NodeOutcome.ERROR).build();
    } else {
      _log('[SYNC USER] User successfully created/updated from EWF source');
      action = fr.Action.goTo(NodeOutcome.SUCCESS).build();
    }
  }

  //_log('Shared state objectAttributes = ' + sharedState.get('objectAttributes'));
  //_log('[SYNC USER] Completed checking user at source.');
} catch (e) {
  sharedState.put('errorMessage', e.toString());
  _log('[SYNC USER] Error during sync of user from EWF source - ' + e);
  action = fr.Action.goTo(NodeOutcome.ERROR).build();
}

// LIBRARY START
// LIBRARY END