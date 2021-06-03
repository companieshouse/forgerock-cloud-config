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
)

var NodeOutcome = {
    TRUE: "true",
    FALSE: "false"
}

// perform the credentials comparison
function validateAuthCode(credential, authCode) {
    if (credential === null || authCode === null) {
        logger.error("[VALIDATE AUTHCODE] Invalid parameter(s) supplied");
        return NodeOutcome.FALSE;
    }

    if (credential.equals(authCode)) {
        logger.error("[VALIDATE AUTHCODE] Credential VALID");
        return NodeOutcome.TRUE;
    } else {
        logger.error("[VALIDATE AUTHCODE] Credential INVALID");
        return NodeOutcome.FALSE;
    }
}

// main execution flow
var credential = sharedState.get("credential");
var companyData = sharedState.get("companyData");

logger.error("[VALIDATE AUTHCODE] credential: " + credential);
logger.error("[VALIDATE AUTHCODE] companyData: " + companyData);

var authCode = JSON.parse(companyData).authCode;
logger.error("[VALIDATE AUTHCODE] auth code: " + authCode);

outcome = validateAuthCode(credential, authCode);