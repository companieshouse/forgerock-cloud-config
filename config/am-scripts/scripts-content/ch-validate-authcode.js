var _scriptName = 'CH VALIDATE AUTHCODE';
_log('Starting');

/* 
  ** INPUT DATA
    * SHARED STATE:
    - 'credential' : the plaintext credential entered by the user
    - 'companyData' : the company data (including cleartext auth code)
   
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
  FALSE: 'false'
};

// perform the credentials comparison
function validateAuthCode (credential, authCode) {
  if (credential === null || authCode === null) {
    _log('Invalid parameter(s) supplied');
    return NodeOutcome.FALSE;
  }

  if (credential.toLowerCase().equals(authCode.toLowerCase())) {
    _log('Credential VALID');
    return NodeOutcome.TRUE;
  } else {
    _log('Credential INVALID');
    return NodeOutcome.FALSE;
  }
}

// main execution flow
var credential = sharedState.get('credential');
var companyData = sharedState.get('companyData');

// _log('companyData: ' + companyData);

var authCode = JSON.parse(companyData).authCode;
// _log('auth code: ' + authCode);

outcome = validateAuthCode(credential, authCode);

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END