var _scriptName = 'CH GET IDM ACCESS TOKEN';
_log('Starting');

var treeServiceUsername = _getVariable('esv.c5d3143c84.manualidmusername');
var treeServiceUserPassword = _getSecret('esv.bdb15f6140.treeserviceuserpassword');

var tokenEndpoint = _fromConfig('FIDC_ENDPOINT') + '/am/oauth2/realms/root/realms/alpha/access_token';
var clientInfoSecretString = '{"id": "AMTreeAdminClient","secret": "' + treeServiceUserPassword + '","scope": "fr:idm:*","serviceUsername": "' + treeServiceUsername + '","servicePassword": "' + treeServiceUserPassword + '"}';

var NodeOutcome = {
  SUCCESS: 'success',
  ERROR: 'error'
};

var ACCESS_TOKEN_STATE_FIELD = 'idmAccessToken';

function fetchSecret () {
  try {
    return JSON.parse(clientInfoSecretString);
  } catch (e) {
    _log('Error while parsing secret: ' + e);
    return false;
  }
}

function logResponse (response) {
  _log('HTTP Response: ' + response.getStatus() + ', Body: ' + response.getEntity().getString());
}

function getAccessToken () {
  var clientInfo = fetchSecret();
  if (!clientInfo) {
    return NodeOutcome.ERROR;
  }
  _log('Secret retrieved: ' + JSON.stringify(clientInfo));
  _log('Getting IDM Access Token');
  var request = new org.forgerock.http.protocol.Request();
  request.setUri(tokenEndpoint);
  request.setMethod('POST');
  request.getHeaders().add('Content-Type', 'application/x-www-form-urlencoded');
  var params = 'grant_type=password' +
    '&client_id=' + clientInfo.id +
    '&client_secret=' + encodeURIComponent(clientInfo.secret) +
    '&scope=' + clientInfo.scope +
    '&username=' + clientInfo.serviceUsername +
    '&password=' + encodeURIComponent(clientInfo.servicePassword);
  request.setEntity(params);
  var response = httpClient.send(request).get();
  logResponse(response);

  var oauth2response = JSON.parse(response.getEntity().getString());
  if (!oauth2response) {
    _log('Bad response');
    return NodeOutcome.ERROR;
  }

  var accessToken = oauth2response.access_token;
  if (!accessToken) {
    _log('Couldn\'t get access token from response');
    return NodeOutcome.ERROR;
  }

  _log('Access token acquired: ' + accessToken);
  transientState.put(ACCESS_TOKEN_STATE_FIELD, accessToken);
  return NodeOutcome.SUCCESS;
}

try {
  outcome = getAccessToken();
} catch (e) {
  sharedState.put('errorMessage', e.toString());
  outcome = NodeOutcome.ERROR;
}

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END