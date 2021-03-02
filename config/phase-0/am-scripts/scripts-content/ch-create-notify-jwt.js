var fr = JavaImporter(
  org.forgerock.json.jose.builders.JwtBuilderFactory,
  org.forgerock.json.jose.jws.handlers.HmacSigningHandler,
  org.forgerock.json.jose.jwt.JwtClaimsSet,
  org.forgerock.json.jose.jws.JwsAlgorithm,
  org.forgerock.secrets.SecretBuilder,
  javax.crypto.spec.SecretKeySpec,
  org.forgerock.secrets.keys.SigningKey,
  org.forgerock.json.jose.jws.handlers.SecretHmacSigningHandler
)

var signingHandler;
var secretbytes;
var secret;
var notifyObj;
var errorFound = false;
var notifyDetails = "{ \"keyName\": \"chsidamtest\", \"issUuid\": \"314d829f-4b8c-40fe-b9f5-50ed6001102d\", \"secretKey\": \"0682b662-4502-430d-bceb-4542bc4e9ee7\", \"templates\": { \"invite\": \"6557568c-b9ca-426d-9ced-ac0d686490e4\", \"requestAuthz\": \"5cab9eb4-e648-4a0d-a27b-558980259440\", \"otpEmail\": \"a1f77c64-9268-49d9-bb64-8ddc6bac0166\", \"otpSms\": \"12ac43ec-5b83-48ec-b3db-9a8f3d6624f6\", \"verifyReg\": \"bf9effa7-3c30-4490-b12b-f1f6527f4c69\", \"resetPwd\": \"a17b882f-08a0-4d91-860c-aac9d42c8f0b\"}}"
var jwt;

try{
  notifyObj = JSON.parse(notifyDetails);
  secret = notifyObj.secretKey;
  secretbytes = java.lang.String(secret).getBytes()
}catch(e){
  logger.error("Error while parsing secret: " + e);
  errorFound = true;
}

logger.error("parsed: " + JSON.stringify(notifyObj));

try{
  signingHandler = new fr.HmacSigningHandler(secretbytes);
  //logger.error("secretbytes: " + secretbytes);
  //var secretBuilder = new fr.SecretBuilder;
  //secretBuilder.secretKey(new javax.crypto.spec.SecretKeySpec(secretbytes, "Hmac"));
  //var key = new fr.SigningKey(secretBuilder);
  //signingHandler = new fr.SecretHmacSigningHandler(key);
}catch(e){
  logger.error("Error while creating signing handler: " + e);
  errorFound = true;
}

try{
  var issuer = notifyObj.issUuid;
  var jwtClaims = new fr.JwtClaimsSet;
  jwtClaims.setIssuer(issuer);
  jwtClaims.setIssuedAtTime(new Date());
  jwt = new fr.JwtBuilderFactory()
        .jws(signingHandler)
        .headers()
        .alg(fr.JwsAlgorithm.HS256)
        .done()
        .claims(jwtClaims)
        .build();
  logger.error("JWT for Notify: " + jwt);
}catch(e){
  logger.error("Error while building JWT - " + e);
  errorFound = true;
}

try{
  transientState.put("notifyJWT", jwt);
  transientState.put("notifyTemplates", JSON.stringify(notifyObj.templates));
  transientState.put("secretKey", secret);
}catch(e){
  logger.error("Error while setting state - " + e);
  errorFound = true;
}

if(errorFound){
  logger.error("Error Found!");
  action = fr.Action.goTo("false").withErrorMessage("Error while creating Notify JWT").build()
}

outcome = "true";