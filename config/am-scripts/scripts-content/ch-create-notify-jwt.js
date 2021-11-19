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
var notifyDetails = '{  "keyName":"chsidamtest", "issUuid":"314d829f-4b8c-40fe-b9f5-50ed6001102d", "secretKey":"0682b662-4502-430d-bceb-4542bc4e9ee7",  "templates":{  "en_invite":"6557568c-b9ca-426d-9ced-ac0d686490e4",  "en_otpEmail":"a1f77c64-9268-49d9-bb64-8ddc6bac0166",  "en_otpSms":"12ac43ec-5b83-48ec-b3db-9a8f3d6624f6",  "en_verifyReg":"bf9effa7-3c30-4490-b12b-f1f6527f4c69",  "en_resetPwd":"a17b882f-08a0-4d91-860c-aac9d42c8f0b",  "en_removal":"e91edfb0-0a8a-4f93-a9cb-35600ca80e71",  "en_existingUser":"29f4d50e-73b6-4075-b1fa-3f59168bfdb6",  "en_notify_user_added_auth_code":"d99f9a5f-e7ae-490b-aad9-3f839326c883",  "en_notify_user_removed":"b9d2e19a-9cf3-49f2-b7d5-fbdc8ab1ea5e",  "en_notify_user_accepted":"ac65325e-74f2-483c-b5fe-d21eb657134d",  "en_notify_user_invited":"1f80a155-2099-4948-a1bf-5cc9245be372",  "en_notify_user_declined":"a4eae0ca-2e9f-461a-b6ea-bc054eed0303",  "en_scrs_notification":"fe482802-18a8-4576-8a6e-8ae872617dc3",  "en_scrs_notification_new":"fd0c6530-bcaa-4b38-8cf0-68221f7e37f8",  "cy_invite":"dc7b3b54-917b-4882-9063-b7ed265c8c5c",  "cy_otpEmail":"2f6fcd37-0fab-4c09-a9e1-69151d0809db",  "cy_otpSms":"264623ae-599d-4385-a0ba-bb9b83d202e1",  "cy_verifyReg":"d573e9a7-877c-495d-bedd-1a026288db80",  "cy_resetPwd":"8207cef7-1f23-4cf6-8d44-d8fff7a3e8c2",  "cy_removal":"38bd9027-d26c-4dc4-8c9a-7b9fd29bdb00",  "cy_existingUser":"bf33a628-34ca-4aa9-8943-70ea6438c797",  "cy_notify_user_added_auth_code":"03dc1310-730e-4d0e-aff3-9253cbfabf36",  "cy_notify_user_removed":"4278d751-2cfb-4cec-a4ed-3c2bed5b5485",  "cy_notify_user_accepted":"ca70a43e-f317-402c-86b7-ed707d6f2b2f",  "cy_notify_user_invited":"e55190fa-ba4a-4dec-9d30-75eec1baad98",  "cy_notify_user_declined":"e641f7fd-eafc-41a8-b730-01e82b726af5", "cy_scrs_notification":"c0ba0d63-551d-45ac-bafc-4763692f27f1", "cy_scrs_notification_new":"fcf3652a-e57a-4215-b67f-c804edeed149" } }';
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