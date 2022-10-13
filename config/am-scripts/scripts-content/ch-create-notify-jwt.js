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

var _scriptName = 'CH CREATE NOTIFY JWT';
_log('Starting');

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
);

// This variable value will be replaced with the relevant value in the target environment (stored in AM secret store) 
var notifyDetails = _getVariable('esv.0e0fbba507.notifydetails');
var notifySecretKey = _getSecret('esv.ad277e8149.notifysecretkey');
var notifyObj;

var NodeOutcome = {
  SUCCESS: 'true',
  ERROR: 'false'
};

// creates a JWT for the GOV Notify call
function buildJwt () {
  var signingHandler;
  var secretbytes;
  var secret;

  try {
    notifyDetails = notifyDetails.replace('SECRET_KEY_GOES_HERE', notifySecretKey);
    notifyObj = JSON.parse(notifyDetails);
    secret = notifyObj.secretKey;
    secretbytes = java.lang.String(secret).getBytes();
  } catch (e) {
    _log('Error while parsing secret: ' + e);
    return false;
  }

  _log('parsed: ' + JSON.stringify(notifyObj));
  var issuer = notifyObj.issUuid;

  try {
    var secretBuilder = new fr.SecretBuilder;

    secretBuilder.secretKey(new javax.crypto.spec.SecretKeySpec(secretbytes, 'Hmac'));
    secretBuilder.stableId(issuer).expiresIn(5, fr.ChronoUnit.MINUTES, fr.Clock.systemUTC());

    var key = new fr.SigningKey(secretBuilder);
    signingHandler = new fr.SecretHmacSigningHandler(key);
  } catch (e) {
    _log('Error : Could not create signing handler: ' + e);
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

    _log('JWT for Notify: ' + jwt);
  } catch (e) {
    _log('Error while building JWT - ' + e);
    return false;
  }
  return jwt;
}

function saveState (jwt) {
  try {
    transientState.put('notifyJWT', jwt);
    transientState.put('notifyTemplates', JSON.stringify(notifyObj.templates));
    transientState.put('secretKey', notifyObj.secretKey);
  } catch (e) {
    _log('Error while setting state - ' + e);
    return NodeOutcome.ERROR;
  }

  return NodeOutcome.SUCCESS;
}

var jwt = buildJwt();

if (!jwt) {
  if (callbacks.isEmpty()) {
    action = fr.Action.send(
      new fr.TextOutputCallback(
        fr.TextOutputCallback.ERROR,
        'Journey failed - Error while creating Notify JWT'
      ),
      new fr.HiddenValueCallback(
        'stage',
        'GENERIC_ERROR'
      ),
      new fr.HiddenValueCallback(
        'pagePropsJSON',
        JSON.stringify({ 'errors': [{ 'label': 'Error while creating Notify JWT', token: 'NOTIFY_JWT_BUILD_ERROR' }] })
      )
    ).build();
  }
} else {
  var saved = saveState(jwt);
  action = fr.Action.goTo(saved).build();
}

// LIBRARY START
// LIBRARY END