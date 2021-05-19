/* 
  ** OUTPUT DATA
    * TRANSIENT STATE
      - 'idmAccessToken' : the IDM Access Token
      
  ** OUTCOMES
    - success: token generated successfully
    - error: error during token generation
*/

var tokenEndpoint = "https://openam-companieshouse-uk-dev.id.forgerock.io/am/oauth2/realms/root/realms/alpha/access_token";
var clientInfoSecretString = "{\"id\": \"AMTreeAdminClient\",\"secret\": \"Passw0rd123!\",\"scope\": \"fr:idm:*\",\"serviceUsername\": \"tree-service-user@companieshouse.com\",\"servicePassword\": \"Passw0rd123!\"}"

var NodeOutcome = {
  SUCCESS: "success",
  ERROR: "error"
}

var ACCESS_TOKEN_STATE_FIELD = "idmAccessToken"

function fetchSecret() {
  try{
    return JSON.parse(clientInfoSecretString);
  }catch(e){
    logger.error("[GET IDM TOKEN] Error while parsing secret: " + e);
    return false;
  }
}

function logResponse(response) {
  logger.error("[GET IDM TOKEN] HTTP Response: " + response.getStatus() + ", Body: " + response.getEntity().getString());
}

function getAccessToken() {
    var clientInfo = fetchSecret();
    if(!clientInfo){
      return NodeOutcome.ERROR;
    }
    logger.message("[GET IDM TOKEN] Secret retrieved: "+JSON.stringify(clientInfo));
    logger.message("[GET IDM TOKEN] Getting IDM Access Token");
    var request = new org.forgerock.http.protocol.Request();
    request.setUri(tokenEndpoint);
    request.setMethod("POST");
    request.getHeaders().add("Content-Type", "application/x-www-form-urlencoded");
    var params = "grant_type=password" +
        "&client_id=" + clientInfo.id +
        "&client_secret=" + encodeURIComponent(clientInfo.secret) +
        "&scope=" + clientInfo.scope +
        "&username=" + clientInfo.serviceUsername +
        "&password=" + encodeURIComponent(clientInfo.servicePassword);
    request.setEntity(params);
    var response = httpClient.send(request).get();
    logResponse(response);
  
    var oauth2response = JSON.parse(response.getEntity().getString());
    if (!oauth2response) {
      logger.error("Bad response")
      return NodeOutcome.ERROR
    }
  
    var accessToken = oauth2response.access_token
    if (!accessToken) {
      logger.error("[GET IDM TOKEN] Couldn't get access token from response")
      return NodeOutcome.ERROR
    }
  
    logger.error("[GET IDM TOKEN] Access token acquired: " + accessToken);
    transientState.put(ACCESS_TOKEN_STATE_FIELD,accessToken);
    return NodeOutcome.SUCCESS;
}

outcome = getAccessToken()