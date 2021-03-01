var fr = JavaImporter(
  org.forgerock.json.jose.builders.JwtBuilderFactory,
  org.forgerock.json.jose.jws.handlers.HmacSigningHandler,
  org.forgerock.json.jose.jwt.JwtClaimsSet,
  org.forgerock.json.jose.jws.JwsAlgorithm
)

var notifyObj;
var notifyDetails = "{ \"keyName\": \"chsidamtest\", \"issUuid\": \"314d829f-4b8c-40fe-b9f5-50ed6001102d\", \"secretKey\": \"0682b662-4502-430d-bceb-4542bc4e9ee7\", \"templates\": { \"invite\": \"6557568c-b9ca-426d-9ced-ac0d686490e4\", \"requestAuthz\": \"5cab9eb4-e648-4a0d-a27b-558980259440\", \"otpEmail\": \"a1f77c64-9268-49d9-bb64-8ddc6bac0166\", \"otpSms\": \"12ac43ec-5b83-48ec-b3db-9a8f3d6624f6\", \"verifyReg\": \"bf9effa7-3c30-4490-b12b-f1f6527f4c69\", \"resetPwd\": \"a17b882f-08a0-4d91-860c-aac9d42c8f0b\"}}"

try{
  notifyObj = JSON.parse(notifyDetails);
}catch(e){
  logger.error("Error while parsing secret: " + e);
}

logger.error("parsed: " + JSON.stringify(notifyObj));

var issuer=notifyObj.issUuid;
var secret=notifyObj.secretKey;
var secretbytes=java.lang.String(secret).getBytes()
var signingHandler=new fr.HmacSigningHandler(secretbytes);

var jwtClaims=new fr.JwtClaimsSet;
jwtClaims.setIssuer(issuer);
jwtClaims.setIssuedAtTime(new Date());
var jwt=new fr.JwtBuilderFactory()
       .jws(signingHandler)
       .headers()
       .alg(fr.JwsAlgorithm.HS256)
       .done()
       .claims(jwtClaims)
       .build();
logger.error("JWT: " + jwt);

try{
  transientState.put("notifyJWT", jwt);
  transientState.put("notifyTemplates", JSON.stringify(notifyObj.templates));
  transientState.put("secretKey", secret);
}catch(e){
  logger.error(e);
}

outcome = "true";