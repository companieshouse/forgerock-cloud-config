var config = {
    rcsSecret: "eFg2TmVCckN4d2s5ZmVTQQ==",
    rcsIssuer: "journey-rcs",
    ssoCookieName: "dd8758f44f45905"
  }
  
  var NodeOutcome = {
    SUCCESS: "success",
    ERROR: "error"
  }
  
  var fr = JavaImporter(
    java.time.Clock,
    java.time.temporal.ChronoUnit,
    javax.crypto.spec.SecretKeySpec, 
    org.forgerock.json.jose.builders.JwtBuilderFactory,
    org.forgerock.json.jose.jws.JwsAlgorithm,
    org.forgerock.json.jose.jws.handlers.SecretHmacSigningHandler,
    org.forgerock.json.jose.jwt.JwtClaimsSet,
    org.forgerock.secrets.SecretBuilder, 
    org.forgerock.secrets.keys.SigningKey, 
    org.forgerock.util.encode.Base64
  )
    
  function getCookie(name) {
    var cookieHeader = requestHeaders.get("Cookie");
    if (cookieHeader == null) {
      return null;
    }  
    var cookies = cookieHeader.get(0).split(";");
    for (var cookie in cookies) {
      var cookieSpec = cookie.split("=");
      if (cookieSpec[0].trim() == name) {
        return cookieSpec[1].trim();
      }
    }
    return null;
  }
  
  function logResponse(response) {
      logger.message("HTTP Response: " + response.getStatus() + ", Body: " + response.getEntity().getString());
  }
  
  function postResponse(url,consentResponse,ssoCookieName,ssoToken) {
      var request = new org.forgerock.http.protocol.Request();
      request.setUri(url);
      request.setMethod("POST");
      request.getHeaders().add("Content-Type", "application/x-www-form-urlencoded");
      request.getHeaders().add("Cookie", ssoCookieName.concat("=").concat(ssoToken));
  
      request.setEntity("consent_response=".concat(consentResponse));
      var response = httpClient.send(request).get();
      logResponse(response);
      var location = response.getHeaders().getFirst("location")
      logger.message("Got location " + location)
      return location
  }
  
  function buildJwt(consentRequest,secret,issuer) {
    logger.message("Building response JWT")
    var secretBytes = fr.Base64.decode(secret);
    var secretBuilder = new fr.SecretBuilder; 
    secretBuilder.secretKey(new javax.crypto.spec.SecretKeySpec(secretBytes, "Hmac")); 
    secretBuilder.stableId(issuer).expiresIn(5, fr.ChronoUnit.MINUTES, fr.Clock.systemUTC());
    var key = new fr.SigningKey(secretBuilder); 
    
    var signingHandler = new fr.SecretHmacSigningHandler(key); 
                  
    var iat = new Date()
    var iatTime = iat.getTime();
  
    var scopes = consentRequest.get("scopes")
    var scopesArray = scopes.keys().toArray()
    
    var jwtClaims = new fr.JwtClaimsSet
    jwtClaims.setIssuer(issuer)
    jwtClaims.addAudience(consentRequest.getIssuer());
    jwtClaims.setIssuedAtTime(new Date());
    jwtClaims.setExpirationTime(new Date(iatTime + (10 * 60 * 1000)))
    jwtClaims.setClaims({
      clientId: consentRequest.get("clientId"),
      client_name: consentRequest.get("client_name"),
      csrf: consentRequest.get("csrf"),
      client_description: consentRequest.get("client_description"),
      claims: consentRequest.get("claims"),
      scopes: scopesArray,
      consentApprovalRedirectUri: redirectUri,
      username: consentRequest.get("username"),
      save_consent_enabled: false,
      decision: sharedState.get("consentDecision")
    })
  
    var jwt = new fr.JwtBuilderFactory()
                    .jws(signingHandler)
                  .headers()
                  .alg(fr.JwsAlgorithm.HS256)
                  .done()
                  .claims(jwtClaims)
                  .build();
  
    logger.message("Signed JWT: " + jwt);
    return jwt  
  }
  
  logger.message("Building consent response")
  
  var ssoToken = getCookie(config.ssoCookieName)                              
  var consentRequest = fr.JwtClaimsSet(sharedState.get("consentRequest"))
  
  logger.message("consent request " + consentRequest)
  
  if (!ssoToken) {
    logger.error("No ssoToken cookie")
    outcome = NodeOutcome.ERROR
  }
  else if (!consentRequest) {
    logger.error("No consent request in shared state")
    outcome = NodeOutcome.ERROR
  }
  else {
    logger.message("posting on user's behalf")
    
    var redirectUri = consentRequest.get("consentApprovalRedirectUri").asString()
  
    logger.message("posting to " + redirectUri)
    
    var jwt = buildJwt(consentRequest,config.rcsSecret,config.rcsIssuer)
  
    logger.message("built jwt " + jwt);
    
    var location = postResponse(redirectUri,jwt,config.ssoCookieName,ssoToken)
    
    logger.message("got location " + location)
    
    if (location == null) {
      logger.error("No redirect back from redirect URI")
      outcome = NodeOutcome.ERROR
    }
    else {
      sharedState.put("successUrl",location)
      outcome = NodeOutcome.SUCCESS
    }
  }