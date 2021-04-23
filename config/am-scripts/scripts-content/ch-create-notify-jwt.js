/* 
  ** INPUT DATA
  ** OUTPUT DATA
    * TRANSIENT STATE
      - 'notifyJWT' : the created JWT
      - 'notifyTemplates': the JSON object containing all the Notify templates defined
      - 'secretKey': the secret key used to sign all other JWTs created for Registration and Password Reset
  ** OUTCOMES
    - true: JWT created successfully
    - false: error during JWT creation
  
  ** CALLBACKS: 
    - error: error while building JWT
*/

var fr = JavaImporter(
  org.forgerock.json.jose.builders.JwtBuilderFactory,
  org.forgerock.json.jose.jwt.JwtClaimsSet,
  org.forgerock.json.jose.jws.JwsAlgorithm,
  org.forgerock.secrets.SecretBuilder,
  javax.crypto.spec.SecretKeySpec,
  org.forgerock.secrets.keys.SigningKey,
  org.forgerock.json.jose.jws.handlers.SecretHmacSigningHandler,
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback,
  org.forgerock.util.encode.Base64,
  java.time.temporal.ChronoUnit,
  java.time.Clock
)

// This variable value will be replaced with the relevant value in the target environment (stored in AM secret store) 
var notifyDetails = "{ \"keyName\": \"chsidamtest\", \"issUuid\": \"314d829f-4b8c-40fe-b9f5-50ed6001102d\", \"secretKey\": \"0682b662-4502-430d-bceb-4542bc4e9ee7\", \"templates\": { \"invite\": \"6557568c-b9ca-426d-9ced-ac0d686490e4\", \"requestAuthz\": \"5cab9eb4-e648-4a0d-a27b-558980259440\", \"otpEmail\": \"a1f77c64-9268-49d9-bb64-8ddc6bac0166\", \"otpSms\": \"12ac43ec-5b83-48ec-b3db-9a8f3d6624f6\", \"verifyReg\": \"bf9effa7-3c30-4490-b12b-f1f6527f4c69\", \"resetPwd\": \"a17b882f-08a0-4d91-860c-aac9d42c8f0b\", \"existingUser\": \"29f4d50e-73b6-4075-b1fa-3f59168bfdb6\"}}"
var notifyObj;
var jwt;

var NodeOutcome = {
  SUCCESS: "true",
  ERROR: "false"
}

// creates a JWT for the GOV Notify call
function buildJwt() {
  var signingHandler;
  var secretbytes;
  var secret;
  try {
    notifyObj = JSON.parse(notifyDetails);
    secret = notifyObj.secretKey;
    secretbytes = java.lang.String(secret).getBytes()
  } catch (e) {
    logger.error("Error while parsing secret: " + e);
    return false;
  }

  logger.error("parsed: " + JSON.stringify(notifyObj));
  var issuer = notifyObj.issUuid;

  try {
    var secretBuilder = new fr.SecretBuilder;
    secretBuilder.secretKey(new javax.crypto.spec.SecretKeySpec(secretbytes, "Hmac"));
    secretBuilder.stableId(issuer).expiresIn(5, fr.ChronoUnit.MINUTES, fr.Clock.systemUTC());
    var key = new fr.SigningKey(secretBuilder);
    signingHandler = new fr.SecretHmacSigningHandler(key);
  } catch (e) {
    logger.error("Error while creating signing handler: " + e);
    return false;
  }

  try {
    var jwtClaims = new fr.JwtClaimsSet;
    jwtClaims.setIssuer(issuer);
    jwtClaims.setIssuedAtTime(new Date());
    var jwt = new fr.JwtBuilderFactory()
      .jws(signingHandler)
      .headers()
      .alg(fr.JwsAlgorithm.HS256)
      .done()
      .claims(jwtClaims)
      .build();
    logger.error("JWT for Notify: " + jwt);
  } catch (e) {
    logger.error("Error while building JWT - " + e);
    return false;
  }
  return jwt;
}

// saves the JWT to transient state for future use
function saveState(jwt) {
  try {
    transientState.put("notifyJWT", jwt);
    transientState.put("notifyTemplates", JSON.stringify(notifyObj.templates));
    transientState.put("secretKey", notifyObj.secretKey);
  } catch (e) {
    logger.error("Error while setting state - " + e);
    return NodeOutcome.ERROR;
  }
  return NodeOutcome.SUCCESS;
}

//main execution flow

var jwt = buildJwt();
if (!jwt) {
  if (callbacks.isEmpty()) {
    action = fr.Action.send(
      new fr.TextOutputCallback(
        fr.TextOutputCallback.ERROR,
        "Journey failed - Error while creating Notify JWT"
      ),
      new fr.HiddenValueCallback(
        "stage",
        "GENERIC_ERROR"
      ),
      new fr.HiddenValueCallback(
        "pagePropsJSON",
        JSON.stringify({ "errors": [{ "label": "Error while creating Notify JWT" , token:"NOTIFY_JWT_BUILD_ERROR" }] })
      )
    ).build()
  }
} else {
  var saved = saveState(jwt);
  action = fr.Action.goTo(saved).build()
}