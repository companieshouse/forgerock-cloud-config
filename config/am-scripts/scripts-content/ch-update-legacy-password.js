var _scriptName = 'CH UPDATE LEGACY PASSWORD';
_log('Starting');

/*
  ** INPUT DATA
    * SHARED STATE:
      - '_id' : the user ID we need to update the password of. This can be manually populated or be result of a previous execution of the 'Identify Exisitng User' node
    * TRANSIENT STATE
      - 'newPassword' : the new password to set as the user's password
  ** OUTPUT DATA
    * TRANSIENT STATE:
      - 'password': the password successfully set on the user
  ** OUTCOMES
    - true: password update successful
    - false: error during password update
    - invalid: password fails complexity policy
*/

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action
);

var ACCESS_TOKEN_STATE_FIELD = 'idmAccessToken';

var updateUserSecretString = '{"endpoint": "' + _fromConfig('FIDC_ENDPOINT') + '/openidm/managed/alpha_user/"}';

function fetchSecret () {
  try {
    return JSON.parse(updateUserSecretString);
  } catch (e) {
    _log('Error while parsing secret: ' + e);
    return false;
  }
}

var NodeOutcome = {
  TRUE: 'true',
  FALSE: 'false',
  INVALID: 'invalid'
};

function logResponse (response) {
  _log('Scripted Node HTTP Response: ' + response.getStatus() + ', Body: ' + response.getEntity().getString());
}

function updateUserPassword (userId, password) {
  if (userId == null) {
    _log('No user name in shared state');
    return NodeOutcome.FALSE;
  }

  var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);
  if (accessToken == null) {
    _log('Access token not in shared state');
    return NodeOutcome.FALSE;
  }

  var updateUser = fetchSecret();
  if (!updateUser) {
    _log('Service info is invalid');
    return NodeOutcome.FALSE;
  }

  var request = new org.forgerock.http.protocol.Request();
  request.setMethod('PATCH');
  request.setUri(updateUser.endpoint + userId);
  request.getHeaders().add('Authorization', 'Bearer ' + accessToken);
  request.getHeaders().add('Content-Type', 'application/json');
  var requestBodyJson = [
    {
      'operation': 'replace',
      'field': '/password',
      'value': password
    },
    {
      'operation': 'replace',
      'field': '/frIndexedString3',
      'value': 'migrated'
    },
  ];
  request.setEntity(requestBodyJson);

  var response = httpClient.send(request).get();

  logResponse(response);

  if (response.getStatus().getCode() === 200) {
    _log('200 response from IDM');
    transientState.put('password', password);
    return NodeOutcome.TRUE;
  } else if (response.getStatus().getCode() === 401) {
    _log('Authentication failed');
    return NodeOutcome.FALSE;
  } else if (response.getStatus().getCode() === 403) {
    var userResponse = JSON.parse(response.getEntity().getString());
    var message = userResponse.message;
    _log('Forbidden: ' + message);
    return NodeOutcome.INVALID;
  }
}

var userId = sharedState.get('_id');
var password = transientState.get('newPassword');

_log('Setting user password for user ' + userId);

outcome = updateUserPassword(userId, password);

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END