var _scriptName = 'CH INVALIDATE USER SESSIONS';
_log('EDMS-INVALIDATE: Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  org.forgerock.json.jose.builders.JwtBuilderFactory,
  org.forgerock.json.jose.jwt.JwtClaimsSet,
  org.forgerock.json.jose.jws.JwsAlgorithm,
  org.forgerock.json.jose.jws.SignedJwt,
  org.forgerock.json.jose.jws.handlers.SecretRSASigningHandler,
  org.forgerock.json.jose.jwk.RsaJWK,
  javax.crypto.spec.SecretKeySpec,
  org.forgerock.secrets.SecretBuilder,
  org.forgerock.secrets.keys.SigningKey,
  java.time.temporal.ChronoUnit,
  java.time.Clock,
  java.util.UUID
);

var NodeOutcome = {
  SUCCESS: 'true'
};

var nodeConfig = {
    nodeName: _scriptName,
    tenantFqdnEsv: "esv.tenant.env.fqdn",
    accountIdEsv: "esv.service.account.id",
    privateKeyEsv: "esv.service.account.privatekey",
    accessTokenStateField: "amAccessToken",
    maxAttempts: 3,
    scope: "fr:am:*",
    serviceAccountClientId: "service-account",
    jwtValiditySeconds: 10,
  };
  
  
var nodeLogger = {
  debug: function (message) {
    logger.message("***" + nodeConfig.nodeName + " " + message);
  },
  warning: function (message) {
    logger.warning("***" + nodeConfig.nodeName + " " + message);
  },
  error: function (message) {
    logger.error("***" + nodeConfig.nodeName + " " + message);
  },
};


function getKeyFromJwk(issuer, jwk) {
  var privateKey = fr.RsaJWK.parse(jwk).toRSAPrivateKey();

  var secretBuilder = new fr.SecretBuilder();

  secretBuilder
    .secretKey(privateKey)
    .stableId(issuer)
    .expiresIn(
    5,
    fr.ChronoUnit.MINUTES,
    fr.Clock.systemUTC()
  );
  return new fr.SigningKey(secretBuilder);
}

function getAssertionJwt(accountId, privateKey, audience, validity) {
  var signingHandler = new fr.SecretRSASigningHandler(
    getKeyFromJwk(accountId, privateKey)
  );

  var iat = new Date().getTime();
  var exp = new Date(iat + validity * 1000);

  var jwtClaims = new fr.JwtClaimsSet();

  jwtClaims.setIssuer(accountId);
  jwtClaims.setSubject(accountId);
  jwtClaims.addAudience(audience);
  jwtClaims.setExpirationTime(exp);
  jwtClaims.setJwtId(fr.UUID.randomUUID());

  var jwt = new fr.JwtBuilderFactory()
  .jws(signingHandler)
  .headers()
  .alg(fr.JwsAlgorithm.RS256)
  .done()
  .claims(jwtClaims)
  .build();

  return jwt;
}

function getAccessToken(accountId, privateKey, tenantFqdn, maxAttempts) {
  var response = null;
  var accessToken = null;
  var tokenEndpoint = "https://"
  .concat(tenantFqdn)
  .concat("/am/oauth2/access_token");

  nodeLogger.debug("Getting Access Token from endpoint " + tokenEndpoint);

  var assertionJwt = getAssertionJwt(
    accountId,
    privateKey,
    tokenEndpoint,
    nodeConfig.jwtValiditySeconds
  );

  if (!assertionJwt) {
    nodeLogger.error("Error getting assertion JWT");
    return null;
  }

  nodeLogger.debug("Got assertion JWT " + assertionJwt);

  for (var attempt = 0; attempt < maxAttempts; attempt++) {
    nodeLogger.debug("Attempt " + (attempt + 1) + " of " + maxAttempts);
    try {
      var request = new org.forgerock.http.protocol.Request();
      request.setUri(tokenEndpoint);
      request.setMethod("POST");
      request
        .getHeaders()
        .add("Content-Type", "application/x-www-form-urlencoded");

      var params = "grant_type="
      .concat(
        encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")
      )
      .concat("&client_id=")
      .concat(encodeURIComponent(nodeConfig.serviceAccountClientId))
      .concat("&assertion=")
      .concat(encodeURIComponent(assertionJwt))
      .concat("&scope=")
      .concat(encodeURIComponent(nodeConfig.scope));

      request.setEntity(params);
      response = httpClient.send(request).get();
      if (response) {
        break;
      }
    } catch (e) {
      nodeLogger.error(
        "Failure calling access token endpoint: " +
        tokenEndpoint +
        " exception:" +
        e
      );
    }
  }

  if (!response) {
    nodeLogger.error("Bad response");
    return null;
  }

  if (response.getStatus().getCode() !== 200) {
    nodeLogger.error(
      "Unable to acquire Access Token. HTTP Result: " + response.getStatus()
    );
    return null;
  }

  try {
    var responseJson = response.getEntity().getString();
    nodeLogger.debug("Response content " + responseJson);
    var oauth2response = JSON.parse(responseJson);
    accessToken = oauth2response.access_token;
    nodeLogger.debug("Access Token acquired: " + accessToken);
    return accessToken;
  } catch (e) {
    nodeLogger.error("Error getting access token from response: " + e);
  }

  return null;
}

(function () {
  try {
    nodeLogger.debug("Node starting");

    var accessToken = transientState.get(nodeConfig.accessTokenStateField);

    if (accessToken) {
      nodeLogger.debug("Access token already present: continuing");
      return;
    }

    var tenantFqdn = systemEnv.getProperty(nodeConfig.tenantFqdnEsv);
    if (!tenantFqdn) {
      nodeLogger.error("Couldn't get FQDN from esv " + nodeConfig.tenantFqdnEsv);
      return;
    }

    var accountId = systemEnv.getProperty(nodeConfig.accountIdEsv);
    if (!accountId) {
      nodeLogger.error(
        "Couldn't get service account id from esv " + nodeConfig.accountIdEsv
      );
      return;
    }

    var privateKey = systemEnv.getProperty(nodeConfig.privateKeyEsv);
    if (!privateKey) {
      nodeLogger.error(
        "Couldn't get private key from esv " + nodeConfig.privateKey
      );
      return;
    }

    accessToken = getAccessToken(
      accountId,
      privateKey,
      tenantFqdn,
      nodeConfig.maxAttempts
    );

    if (!accessToken) {
      nodeLogger.error("Failed to get access token");
      return;
    }

    nodeLogger.debug("Success - adding token to transient state");
    transientState.put(nodeConfig.accessTokenStateField, accessToken);
  } catch (e) {
    nodeLogger.error("Exception encountered " + e);
    return;
  }
})();
  
  
  // STARTING INVALIDATE SESSIONS REQUEST
 var userName = sharedState.get("userName")
 _log(`EDMS-USERNAME: Get userName - ${userName}`)
 var testFqdn = systemEnv.getProperty(nodeConfig.tenantFqdnEsv)
 var at = transientState.get(nodeConfig.accessTokenStateField)
 _log(`EDMS-TESTING: ${userName}`)
 _log(`EDMS-TESTING-TOKEN: ${at}`)
_log(`EDMS-TESTING-FQDN: ${testFqdn}`)

_log(`EDMS-REQUEST: Starting API request`)
 var request = new org.forgerock.http.protocol.Request();
_log(`EDMS-REQUEST: Setting request method`)
 request.setMethod('POST')
_log(`Setting request URL with ${testFqdn}`)
 request.setUri(`https://${testFqdn}/am/json/realms/root/realms/alpha/sessions/?_action=logoutByUser`);
 request.getHeaders().add('Authorization', 'Bearer ' + at);
 request.getHeaders().add('Content-Type', 'application/json');
 request.getHeaders().add('Accept-API-Version', 'resource=5.1, protocol=1.0');
 request.setEntity(JSON.stringify({"username": userName}));

_log(`EDMS-REQUEST: Making HTTP Request`)
 var response = httpClient.send(request).get();
_log(`EDMS-SESSION-RESPONSE: ${response.getStatus().getCode()}`)

action = fr.Action.goTo(NodeOutcome.SUCCESS).build();


// LIBRARY START
// LIBRARY END