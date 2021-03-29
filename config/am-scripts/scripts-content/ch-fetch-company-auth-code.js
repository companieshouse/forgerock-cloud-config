var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action
)

var ACCESS_TOKEN_STATE_FIELD = "idmAccessToken";

var fetchCompanySecretString = "{\"endpoint\": \"https://openam-companieshouse-uk-dev.id.forgerock.io/openidm/managed/Company/\"}";

function fetchSecret() {
    try {
        return JSON.parse(fetchCompanySecretString);
    } catch (e) {
        logger.error("[FETCH COMPANY AUTH CODE] Error while parsing secret: " + e);
        return false;
    }
}

var NodeOutcome = {
    TRUE: "true",
    FALSE: "false"
}

function logResponse(response) {
    logger.error("[FETCH COMPANY AUTH CODE] Scripted Node HTTP Response: " + response.getStatus() + ", Body: " + response.getEntity().getString());
}

function fetchCompanyAuthCode(companyNumber) {
    var userId = sharedState.get("_id");
    logger.error("[FETCH COMPANY AUTH CODE] Found userId: " + userId);

    var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);
    if (accessToken == null) {
      logger.error("[FETCH COMPANY AUTH CODE] Access token not in shared state")
      return NodeOutcome.FALSE
    }

    var fetchCompanyInfo = fetchSecret();
    if (!fetchCompanyInfo) {
        logger.error("[FETCH COMPANY AUTH CODE] validateServiceInfo is invalid");
        return NodeOutcome.FALSE
    }

    var request = new org.forgerock.http.protocol.Request();
    request.setMethod('GET');
    var searchTerm = "?_queryFilter=number+eq+%22" + companyNumber + "%22";
    request.setUri(fetchCompanyInfo.endpoint + searchTerm);
    request.getHeaders().add("Authorization", "Bearer " + accessToken);
    request.getHeaders().add("Content-Type", "application/json");

    var response = httpClient.send(request).get();

    logResponse(response);

    if (response.getStatus().getCode() === 200) {
        logger.error("[FETCH COMPANY AUTH CODE] 200 response from IDM");
        var companyResponse = JSON.parse(response.getEntity().getString());

        if (companyResponse.resultCount == 1) {
            logger.error("[FETCH COMPANY AUTH CODE] Got a result");

            var authCode = companyResponse.result[0].authCode;
            if (authCode == null) {
                logger.error("[FETCH COMPANY AUTH CODE] No auth code associated with company")
                return NodeOutcome.FALSE
            }
            
            logger.error("[FETCH COMPANY AUTH CODE] Found authCode: " + authCode);
            sharedState.put("hashedCredential", authCode);
            return NodeOutcome.TRUE;
        } else {
            logger.error("[FETCH COMPANY AUTH CODE] No company results")
            return NodeOutcome.FALSE
        }
    } else if (response.getStatus().getCode() === 401) {
        logger.error("[FETCH COMPANY AUTH CODE] Authentication failed for company fetch");
        return NodeOutcome.FALSE;
    }

}

var companyNumber = sharedState.get("companyNumber");
if (companyNumber == null) {
    logger.error("[FETCH COMPANY AUTH CODE] No company number in shared state");
    return NodeOutcome.FALSE;
}

outcome = fetchCompanyAuthCode(companyNumber);