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
    org.forgerock.util.encode.Base64,
    javax.security.auth.callback.TextOutputCallback
)
    
function getCookie(name) {
    var cookieHeader = requestHeaders.get("Cookie");
    logger.error("[SEND CONSENT RESPONSE] cookieHeader: " + cookieHeader);
    if (cookieHeader == null) {
      return null;
    }

    var cookies = cookieHeader.get(0).split(";");
    logger.error("[SEND CONSENT RESPONSE] Cookies: " + cookies);

    for each (cookie in cookies) {
        logger.error("[SEND CONSENT RESPONSE] specific cookie: " + cookie);
        var cookieSpec = cookie.split("=");
        logger.error("[SEND CONSENT RESPONSE] cookieSpec: " + cookieSpec);
        if (cookieSpec[0].trim() == name) {
            logger.error("[SEND CONSENT RESPONSE] Gotcha " + cookieSpec);
            return cookieSpec[1].trim();
        }
    }

    return null;
}
  
function logResponse(response) {
    logger.error("[SEND CONSENT RESPONSE] HTTP Response: " + response.getStatus() + ", Body: " + response.getEntity().getString());
}

function raiseError(message) {
    action = fr.Action.send(
        new fr.TextOutputCallback(
            fr.TextOutputCallback.ERROR,
            message
        )
    ).build()
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
      logger.error("[SEND CONSENT RESPONSE] Got location " + location)
      return location
}
  
function buildJwt(consentRequest,secret,issuer) {
    logger.error("[SEND CONSENT RESPONSE] Building response JWT")
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
  
    logger.error("[SEND CONSENT RESPONSE] Signed JWT: " + jwt);
    return jwt  
}

logger.error("[SEND CONSENT RESPONSE] Building consent response")

var ssoToken = getCookie(config.ssoCookieName)                              
var consentRequest = fr.JwtClaimsSet(sharedState.get("consentRequest"))
    
logger.error("[SEND CONSENT RESPONSE] consent request " + consentRequest)
    
if (!ssoToken) {
    logger.error("[SEND CONSENT RESPONSE] No ssoToken cookie")
    //raiseError("[SEND CONSENT RESPONSE] No ssoToken cookie")
    outcome = NodeOutcome.ERROR
} else if (!consentRequest) {
    logger.error("[SEND CONSENT RESPONSE] No consent request in shared state")
    //raiseError("[SEND CONSENT RESPONSE] No consent request in shared state")
    outcome = NodeOutcome.ERROR
} else {
    logger.error("[SEND CONSENT RESPONSE] posting on user's behalf")
        
    var redirectUri = consentRequest.get("consentApprovalRedirectUri").asString()  
    logger.error("[SEND CONSENT RESPONSE] posting to " + redirectUri)
        
    var jwt = buildJwt(consentRequest,config.rcsSecret,config.rcsIssuer)
    logger.error("[SEND CONSENT RESPONSE] built jwt " + jwt);
        
    var location = postResponse(redirectUri,jwt,config.ssoCookieName,ssoToken)
    logger.error("[SEND CONSENT RESPONSE] got location " + location)
        
    if (location == null) {
        logger.error("[SEND CONSENT RESPONSE] No redirect back from redirect URI")
        raiseError("[SEND CONSENT RESPONSE] No redirect back from redirect URI")
        //outcome = NodeOutcome.ERROR
    } else {
        sharedState.put("successUrl",location)
        outcome = NodeOutcome.SUCCESS
    }
}