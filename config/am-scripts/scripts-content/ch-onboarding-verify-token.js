var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  java.lang.Math,
  java.lang.String,
  org.forgerock.openam.auth.node.api,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback,
  org.forgerock.json.jose.builders.JwtBuilderFactory,
  org.forgerock.json.jose.jwt.JwtClaimsSet,
  org.forgerock.json.jose.jws.JwsAlgorithm,
  org.forgerock.json.jose.jws.SignedJwt,
  org.forgerock.json.jose.jws.JwsHeader
)

var NodeOutcome = {
  SUCCESS: "true",
  ERROR: "false"
}

var MembershipStatus = {
  CONFIRMED: "confirmed",
  PENDING: "pending",
  NONE: "none"
}

var FIDC_ENDPOINT = "https://openam-companieshouse-uk-dev.id.forgerock.io";

function extractTokenParameter() {
  var tokenURLParam = requestParameters.get("token");
  if (!tokenURLParam) {
    if (callbacks.isEmpty()) {
      action = fr.Action.send(
        new fr.HiddenValueCallback(
          "stage",
          "ONBOARDING_ERROR"
        ),
        new fr.HiddenValueCallback(
          "pagePropsJSON",
          JSON.stringify({ "error": "No Onboarding Token found in request.", "token": "ONBOARDING_NO_TOKEN_ERROR" })
        ),
        new fr.TextOutputCallback(
          fr.TextOutputCallback.ERROR,
          "Token parameter not found"
        )
      ).build();
      return false;
    }
  } else {
    return tokenURLParam.get(0);
  }
}

//fetches the IDM access token from transient state
function fetchIDMToken() {
  var ACCESS_TOKEN_STATE_FIELD = "idmAccessToken";
  var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);
  if (accessToken === null) {
      logger.error("[ONBOARDING-RESUME] Access token not in transient state")
      return false;
  }
  return accessToken;
}

//checks whether the user with the given email already exists in IDM
function lookupUser(email) {
  try {
    var idmUserEndpoint = FIDC_ENDPOINT + "/openidm/managed/alpha_user?_queryFilter=userName+eq+%22" + email + "%22";
    var request = new org.forgerock.http.protocol.Request();
    var accessToken = fetchIDMToken();
    if (!accessToken) {
      logger.error("[ONBOARDING-RESUME - CHECK MEMBERSHIP] Access token not in transient state");
      return {
        success: false,
        error: "Access token not in transient state"
      } 
    }

    request.setMethod('GET');
    request.setUri(idmUserEndpoint);
    request.getHeaders().add("Authorization", "Bearer " + accessToken);
    request.getHeaders().add("Content-Type", "application/json");
    request.getHeaders().add("Accept-API-Version", "resource=1.0");

    var response = httpClient.send(request).get();

    if (response.getStatus().getCode() === 200) {
      var searchResponse = JSON.parse(response.getEntity().getString());
      if (searchResponse && searchResponse.result && searchResponse.result.length > 0) {
        logger.error("[ONBOARDING-RESUME] user found: " + searchResponse.result[0].toString());
        return {
          success: true,
          user: searchResponse.result[0]
        } 
      } else {
        logger.error("[ONBOARDING-RESUME] user NOT found: " + email);
        return {
          success: true,
          user: null
        } 
      }
    } else {
      logger.error("[ONBOARDING-RESUME] Error while looking up user: " + response.getStatus().getCode())
      return {
        success: false,
        error: "Error while looking up user: " + response.getStatus().getCode()
      } 
    }
  } catch (e) {
    logger.error(e)
    return {
      success: false,
      error: "Error while checking user existence: " + e.toString()
    } 
  }
}

// extracts the user membership status to the given company. User could be provided as a user ID or a username (email) 
function isUserInvitedForCompany(userEmail, companyNo) {
  var request = new org.forgerock.http.protocol.Request();
  var accessToken = transientState.get("idmAccessToken");
  var idmCompanyAuthEndpoint = FIDC_ENDPOINT + "/openidm/endpoint/companyauth?_action=getCompanyStatusByUsername";
  if (accessToken === null) {
    logger.error("[ONBOARDING-RESUME - CHECK MEMBERSHIP] Access token not in transient state");
    return {
        success: false,
        error: "Access token not in transient state"
    } 
  }

  var requestBodyJson = {
    "userName": userEmail,
    "companyNumber": companyNo
  };

  request.setMethod('POST');
  logger.error("[ONBOARDING-RESUME - CHECK MEMBERSHIP] Check user " + userEmail + " membership status to company " + companyNo);
  request.setUri(idmCompanyAuthEndpoint);
  request.getHeaders().add("Authorization", "Bearer " + accessToken);
  request.getHeaders().add("Content-Type", "application/json");
  request.getHeaders().add("Accept-API-Version", "resource=1.0");
  request.setEntity(requestBodyJson);

  var response = httpClient.send(request).get();

  if (response.getStatus().getCode() === 200) {
    logger.error("[ONBOARDING-RESUME - CHECK MEMBERSHIP] 200 response from IDM");
    var membershipResponse = JSON.parse(response.getEntity().getString());
    return {
        success: true,
        isPending: (membershipResponse.company.status === MembershipStatus.PENDING)
    } 
  } else {
    logger.error("[ONBOARDING-RESUME - CHECK MEMBERSHIP] Error during relationship check");
    return {
        success: false,
        error: "Error during relationship check - " + response.getStatus().getCode()
    } 
  }
}

function extractInfoFromToken(tokenURL) {
  logger.error("[ONBOARDING-RESUME] received token: " + tokenURL);
  // TODO: TOKEN DECRYPTION
  try {
    // reconstruct the inbound token, extract the originating email and creation date
    var signedJwt = new fr.JwtBuilderFactory().reconstruct(tokenURL, fr.SignedJwt);
    var claimSet = signedJwt.getClaimsSet();
    var email = claimSet.getSubject();
    var iat = claimSet.getClaim("creationDate");
    var companyNo = claimSet.getClaim("companyNo");
    var now = new Date();
    differenceInTime = now.getTime() - (new Date(iat)).getTime();
    logger.error("[ONBOARDING-RESUME] initiating email: " + email + " on: " + iat + " - difference (hours): " + Math.round(differenceInTime / (1000 * 60) / 60));
    logger.error("[ONBOARDING-RESUME] companyNo: " + companyNo);
    return {
      email: email,
      companyNo: companyNo,
      differenceInTime: differenceInTime
    }
  } catch (e) {
    logger.error("[ONBOARDING-RESUME] error while reconstructing JWT: " + e);
    return false;
  }
}

function raiseError(message, token) {
  if (callbacks.isEmpty()) {
    action = fr.Action.send(
      new fr.HiddenValueCallback(
        "stage",
        "ONBOARDING_ERROR"
      ),
      new fr.HiddenValueCallback(
        "pagePropsJSON",
        JSON.stringify({ "error": message, "token": token })
      ),
      new fr.TextOutputCallback(
        fr.TextOutputCallback.ERROR,
        message
      )
    ).build()
  }
}

function saveUserDataToState(tokenData) {
  logger.error("[ONBOARDING-RESUME] The provided token is still valid");
  try {
    // put the read attributes in shared state for the Create Object node to consume
    sharedState.put("objectAttributes",
      {
        "userName": tokenData.email,
        "sn": tokenData.email,
        "mail": tokenData.email
      });
    sharedState.put("userName", tokenData.email);
    return NodeOutcome.SUCCESS;
  } catch (e) {
    logger.error("[ONBOARDING-RESUME] error while storing state: " + e);
    return NodeOutcome.ERROR;
  }
}

// reads the onboarding date
function validateOnboardingDate(user) {
  var onboardDate = user.frIndexedDate2;
  logger.error("[ONBOARDING-RESUME] onboarding date: " + onboardDate);

  if (onboardDate.length > 0) {
    var year = onboardDate.substring(0, 4);
    var month = onboardDate.substring(4, 6);
    var offsetMonth = parseInt(month) - 1;
    var day = onboardDate.substring(6, 8);
    var hour = onboardDate.substring(8, 10);
    var min = onboardDate.substring(10, 12);
    var sec = onboardDate.substring(12, 14);

    var lastLoginDateUTC = Date.UTC(year, offsetMonth, day, hour, min, sec);

    var now = new Date();

    var intervalDays = 7;
    var intervalInMillis = intervalDays * 86400 * 1000;

    var delta = now.getTime() - lastLoginDateUTC; // Difference in ms
    if (delta > intervalInMillis) {
      logger.error("[ONBOARDING-RESUME] Onboarding date is older than " + intervalDays + " days");
      return false;
    } else {
      logger.error("[ONBOARDING-RESUME] Onboarding date valid");
      return true;
    }
  }
}


//main execution flow

try{
  var token = extractTokenParameter();
  sharedState.put("isOnboarding", true);

  if (token) {
    // TODO: TOKEN VERIFICATION
    // see https://git.openam.org.ru/org.forgerock/org.forgerock.openam/blob/6d8bd7c079ed52aaefecb12e1b233ea697431a96/openam/openam-core-rest/src/main/java/org/forgerock/openam/core/rest/authn/AuthIdHelper.java
    //  String keyAlias = getKeyAlias(realmDN);
    //  PublicKey publicKey = amKeyProvider.getPublicKey(keyAlias);
    //  SigningHandler signingHandler = signingManager.newHmacSigningHandler(publicKey.getEncoded());
    //  var verified = signedJwt.verify(signingHandler)
    var tokenData = extractInfoFromToken(token);

    if (!tokenData) {
      raiseError("An error occurred while parsing the onboarding token.", "ONBOARDING_TOKEN_PARSING_ERROR");
    } else {
      var userResponse = lookupUser(tokenData.email);

      if (!userResponse.success) {
        raiseError(userResponse.error, "ONBOARDING_USER_LOOKUP_ERROR");
      } else if (!userResponse.user) {
        raiseError("The invited user does not exist.", "ONBOARDING_USER_NOT_FOUND_ERROR");
      } else {
        var isUserInvited = isUserInvitedForCompany(tokenData.email, tokenData.companyNo);
        if(!isUserInvited.success){
          raiseError(isUserInvited.error, "ONBOARDING_USER_LOOKUP_ERROR");
        } else if (!isUserInvited.isPending){
           raiseError("The user is not invited for the company", "ONBOARDING_NO_INVITE_FOUND_ERROR");
        } else if (!validateOnboardingDate(userResponse.user)) {
          raiseError("The onboarding date is expired.", "ONBOARDING_DATE_EXPIRED_ERROR");
        } else if (Math.round(tokenData.differenceInTime / (1000 * 60 * 60)) < 168) {
          outcome = saveUserDataToState(tokenData);
        } else {
          raiseError("The onboarding token has expired.", "ONBOARDING_TOKEN_EXPIRED_ERROR");
        }
      }
    }
  }
  outcome = NodeOutcome.SUCCESS;
} catch(e){
  logger.error("[ONBOARDING-RESUME] error " + e);
  sharedState.put("errorMessage", e.toString());
  //raiseError("general error: ".concat(e.toString()), "ONBOARDING_DATE_EXPIRED_ERROR");
  outcome = NodeOutcome.ERROR;
}