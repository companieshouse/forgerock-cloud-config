var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.NameCallback,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback
)

var MembershipStatus = {
    CONFIRMED: "confirmed",
    PENDING: "pending",
    NONE: "none"
}

var NodeOutcome = {
    USER_ASSOCIATED: "user_associated",
    USER_NOT_ASSOCIATED: "user_not_associated",
    ERROR: "error"
}

function logResponse(response) {
    logger.error("[FETCH COMPANY] Scripted Node HTTP Response: " + response.getStatus() + ", Body: " + response.getEntity().getString());
}

// gets company information
function getCompanyInfo(userId, companyNo) {
  
  var request = new org.forgerock.http.protocol.Request();
  var ACCESS_TOKEN_STATE_FIELD = "idmAccessToken";
  var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);
  if (accessToken == null) {
    logger.error("[INVITE USER CHECK MEMBERSHIP] Access token not in shared state");
    return NodeOutcome.ERROR;
  }

  var requestBodyJson =
  {
    "callerId": userId,
    "companyNumber": companyNo
  };

  request.setMethod('POST');
  logger.error("[INVITE USER - GET COMPANY DETAILS] Get company details for " + companyNo);
  request.setUri(idmCompanyAuthEndpoint + "?_action=getCompanyByNumber");
  request.getHeaders().add("Authorization", "Bearer " + accessToken);
  request.getHeaders().add("Content-Type", "application/json");
  request.getHeaders().add("Accept-API-Version", "resource=1.0");
  request.setEntity(requestBodyJson);

  var response = httpClient.send(request).get();
  var companyResponse = JSON.parse(response.getEntity().getString());
  if (response.getStatus().getCode() === 200) {
    logger.error("[INVITE USER - GET COMPANY DETAILS] 200 response from IDM");

    if (companyResponse.success) {
      return companyResponse.company;
    } else {
      logger.error("[INVITE USER - GET COMPANY DETAILS] Error during company lookup");
      var errorProps = JSON.stringify(
        {
          'errors': [{
            label: companyResponse.message,
            token: "INVITE_USER_COMPANY_LOOKUP_ERROR"
          }]
        });

      if (callbacks.isEmpty()) {
        action = fr.Action.send(
          new fr.TextOutputCallback(fr.TextOutputCallback.ERROR, companyResponse.message),
          new fr.HiddenValueCallback("stage", "INVITE_USER_ERROR"),
          new fr.HiddenValueCallback("pagePropsJSON", errorProps)
        ).build();
      }
    }
  } else {
    return false;
  }
}

// extracts the user membership status to the given company. User could be provided as a user ID or a username (email) 
function getUserMembershipForCompany(userIdentifier, companyNo) {
    var request = new org.forgerock.http.protocol.Request();
    var ACCESS_TOKEN_STATE_FIELD = "idmAccessToken";
    var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);
    if (accessToken == null) {
        logger.error("[EWF - CHECK COMPANY MEMBERSHIP] Access token not in shared state");
        return false;
    }

    var requestBodyJson = {
        "userId": userIdentifier,
        "companyNumber": companyNo
    };

    request.setMethod('POST');
    logger.error("[EWF - CHECK COMPANY MEMBERSHIP] Check user " + userIdentifier + "membership status to company " + companyNo);
    request.setUri(idmCompanyAuthEndpoint + "?_action=getCompanyStatusByUserId");
    request.getHeaders().add("Authorization", "Bearer " + accessToken);
    request.getHeaders().add("Content-Type", "application/json");
    request.getHeaders().add("Accept-API-Version", "resource=1.0");
    request.setEntity(requestBodyJson);

    var response = httpClient.send(request).get();

    logResponse(response);
    if (response.getStatus().getCode() === 200) {
        logger.error("[EWF - CHECK COMPANY MEMBERSHIP] 200 response from IDM");
        var membershipResponse = JSON.parse(response.getEntity().getString());
        return membershipResponse;
    }
    else {
        logger.error("[EWF - CHECK COMPANY MEMBERSHIP] Error during relationship creation");
        return false;
    }
}

//extracts the language form headers (default to EN)
function getSelectedLanguage(requestHeaders) {
  if (requestHeaders && requestHeaders.get("Chosen-Language")) {
      var lang = requestHeaders.get("Chosen-Language").get(0);
      logger.error("[EWF - CHECK COMPANY MEMBERSHIP] selected language: " + lang);
      return lang;
  }
  logger.error("[EWF - CHECK COMPANY MEMBERSHIP] no selected language found - defaulting to EN");
  return 'EN';
}

try {
    var idmCompanyAuthEndpoint = "https://openam-companieshouse-uk-dev.id.forgerock.io/openidm/endpoint/companyauth/";
    var companyNo = JSON.parse(sharedState.get("companyData")).number;
    var sessionOwner = sharedState.get("_id");
    logger.error("[EWF - CHECK COMPANY MEMBERSHIP] session owner: " + sessionOwner);
    var language = getSelectedLanguage(requestHeaders);

    var companyMembership = getUserMembershipForCompany(sessionOwner, companyNo);
    if (!companyMembership) {
        logger.error("[EWF - CHECK COMPANY MEMBERSHIP] Error while invoking endpoint");
        outcome = NodeOutcome.ERROR;
    } else {
        if (companyMembership.company.status !== MembershipStatus.CONFIRMED) {
            logger.error("[EWF - CHECK COMPANY MEMBERSHIP] User not associated with company! Current status" + companyMembership.company.status);           
            action = fr.Action.goTo(NodeOutcome.USER_NOT_ASSOCIATED)
                .build();
        } else {
            logger.error("[EWF - CHECK COMPANY MEMBERSHIP] User already associated with company!");
            action = fr.Action.goTo(NodeOutcome.USER_ASSOCIATED)
                .putSessionProperty("authCode",  JSON.parse(sharedState.get("companyData")).authCode)
                .putSessionProperty("language",  language.toLowerCase())
                .build();
        }
    }
} catch (e) {
    logger.error("[EWF - CHECK COMPANY MEMBERSHIP] Error " + e);
    sharedState.put("errorMessage", e.toString())
    outcome = NodeOutcome.ERROR;
}