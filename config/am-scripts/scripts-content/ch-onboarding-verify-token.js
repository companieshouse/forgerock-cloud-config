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
  if (accessToken == null) {
      logger.error("[ONBOARDING-RESUME] Access token not in transient state")
      return false;
  }
  return accessToken;
}

//checks whether the user with the given email already exists in IDM
function checkUserExistence(email) {
  try {
    var idmUserEndpoint = FIDC_ENDPOINT.concat("/openidm/managed/alpha_user?_queryFilter=userName+eq+%22" + email + "%22");
    var request = new org.forgerock.http.protocol.Request();
    var accessToken = fetchIDMToken();
    if (!accessToken) {
      action = fr.Action.goTo(NodeOutcome.ERROR).build();
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
        return searchResponse.result[0];
      } else {
        logger.error("[ONBOARDING-RESUME] user NOT found: " + email);
        return false;
      }
    } else {
      logger.error("[ONBOARDING-RESUME] Error while checking user existence: " + response.getStatus().getCode())
      return NodeOutcome.ERROR;
    }
  } catch (e) {
    logger.error(e)
    return NodeOutcome.ERROR;
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
  //var ONBOARDING_DATE_FIELD = "frIndexedDate2";
  // if (idRepository.getAttribute(userId, ONBOARDING_DATE_FIELD).iterator().hasNext()) {
  var onboardDate = user.frIndexedDate2;

  logger.error("[ONBOARDING-RESUME] onboarding date: " + onboardDate); // e.g. 20210317114005Z

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
var FIDC_ENDPOINT = "https://openam-companieshouse-uk-dev.id.forgerock.io";
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
    var user = checkUserExistence(tokenData.email);

    if (user === NodeOutcome.ERROR) {
      raiseError("Error during user lookup.", "ONBOARDING_USER_LOOKUP_ERROR");
    } else if (!user) {
      raiseError("The onboarding user does not exist.", "ONBOARDING_USER_NOT_FOUND_ERROR");
    } else if (!validateOnboardingDate(user)) {
      raiseError("The onboarding date is expired.", "ONBOARDING_DATE_EXPIRED_ERROR");
    } else if (Math.round(tokenData.differenceInTime / (1000 * 60 * 60)) < 168) {
      outcome = saveUserDataToState(tokenData);
    } else {
      raiseError("The onboarding token has expired.", "ONBOARDING_TOKEN_EXPIRED_ERROR");
      outcome = NodeOutcome.ERROR;
    }
  }
}