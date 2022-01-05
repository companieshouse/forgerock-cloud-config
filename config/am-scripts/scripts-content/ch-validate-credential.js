var _scriptName = 'CH VALIDATE CREDENTIAL';
_log('Starting');

/* 
  ** INPUT DATA
    * SHARED STATE:
    - 'credential' : the plaintext credential entered by the user 
    - 'hashedCredential' : the hashed credentials to compare against
    - 'validateMethod' : the validation method ('CHS' for CH BCrypt, or any other value for standard BCrypt)
   
  ** OUTCOMES
    - true: comparison successful
    - false: comparison failed, or error
*/

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback
);

var NodeOutcome = {
  TRUE: 'true',
  FALSE: 'false',
  ERROR: 'error'
};

var validateServiceSecretString = '{"endpoint": "' + _fromConfig('VALIDATE_SERVICE_SECRET_ENDPOINT') + '","apiKey": "' + _getSecret('esv.22ada955a0.validatesecretservicekey') + '"}';

//fetches the secret as a JSON object
function fetchSecret () {
  try {
    return JSON.parse(validateServiceSecretString);
  } catch (e) {
    _log('Error while parsing secret: ' + e);
    return false;
  }
}

// perform the credentials comparison against an external service
function validateCredential (credential, hash, validateMethod) {
  var validateServiceInfo = fetchSecret();
  if (!validateServiceInfo) {
    _log('validateServiceInfo is invalid');
    outcome = NodeOutcome.FALSE;
  }

  var request = new org.forgerock.http.protocol.Request();
  request.setUri(validateServiceInfo.endpoint);
  request.setMethod('POST');
  request.getHeaders().add('Content-Type', 'application/json');
  request.getHeaders().add('x-api-key', validateServiceInfo.apiKey);

  var requestBodyJson = {
    'password': credential,
    'hash': hash,
    'method': validateMethod
  };
  request.getEntity().setString(JSON.stringify(requestBodyJson));

  var response = httpClient.send(request).get();
  _log('HTTP Response: ' + response.getStatus() + ', Body: ' + response.getEntity().getString());

  if (response.getStatus().getCode() === 200) {
    var validationResponse = JSON.parse(response.getEntity().getString());
    _log('validationResponse: ' + validationResponse);
    if (validationResponse.errorMessage) {
      _log('cannot parse hash: ' + hash);
      return NodeOutcome.FALSE; //TOD return error outcome and handle it in tree
    }

    if (validationResponse === 'true') {
      _log('Credential VALID');
      return NodeOutcome.TRUE;
    } else if (validationResponse === 'false') {
      _log('Credential INVALID');
      return NodeOutcome.FALSE;
    }
  } else {
    _log('Invalid response returned: ' + response.getStatus().getCode());
    return NodeOutcome.FALSE;
  }
}

// main execution flow
var credential = sharedState.get('credential');
var hash = sharedState.get('hashedCredential');
var validateMethod = sharedState.get('validateMethod');

_log('credential: ' + credential);
_log('hashedCredential: ' + hash);
_log('validateMethod: ' + validateMethod);

outcome = validateCredential(credential, hash, validateMethod);

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END