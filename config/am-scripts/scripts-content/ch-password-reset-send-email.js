var _scriptName = 'CH PASSWORD RESET SEND EMAIL';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  java.lang.Math,
  org.forgerock.openam.auth.node.api,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback,
  org.forgerock.json.jose.builders.JwtBuilderFactory,
  org.forgerock.json.jose.jwt.JwtClaimsSet,
  org.forgerock.json.jose.jws.JwsAlgorithm,
  org.forgerock.json.jose.jwe.JweAlgorithm,
  org.forgerock.json.jose.jwe.EncryptionMethod,
  org.forgerock.json.jose.jws.SignedJwt,
  org.forgerock.json.jose.jws.EncryptedThenSignedJwt,
  org.forgerock.json.jose.jwe.SignedThenEncryptedJwt,
  org.forgerock.json.jose.jws.handlers.SecretHmacSigningHandler,
  javax.crypto.spec.SecretKeySpec,
  org.forgerock.secrets.SecretBuilder,
  org.forgerock.secrets.keys.SigningKey,
  org.forgerock.secrets.keys.VerificationKey,
  org.forgerock.util.encode.Base64,
  java.time.temporal.ChronoUnit,
  java.time.Clock
);

var NodeOutcome = {
  SUCCESS: 'true',
  ERROR: 'false'
};

var KeyType = {
  SIGNING: 0,
  VERIFICATION: 1,
  ENCRYPTION: 2
};

var JwtType = {
  SIGNED: 0,
  ENCRYPTED: 1,
  SIGNED_THEN_ENCRYPTED: 2,
  ENCRYPTED_THEN_SIGNED: 3
};

function getKey (secret, keyType) {
  if (keyType == KeyType.ENCRYPTION) {
    return new fr.SecretKeySpec(fr.Base64.decode(config.encryptionKey), 'AES');
  } else {
    var secretBytes = fr.Base64.decode(secret);
    var secretBuilder = new fr.SecretBuilder;
    secretBuilder.secretKey(new javax.crypto.spec.SecretKeySpec(secretBytes, 'Hmac'));
    secretBuilder.stableId(config.issuer).expiresIn(5, fr.ChronoUnit.MINUTES, fr.Clock.systemUTC());
    return (keyType === KeyType.SIGNING) ? new fr.SigningKey(secretBuilder) : new fr.VerificationKey(secretBuilder);
  }
}

//extracts the email address from shared state
function extractEmailFromState () {
  _log('host: ' + host);
  _log('shared: ' + sharedState.get('objectAttributes'));

  try {
    email = sharedState.get('objectAttributes').get('mail');
    _log('mail : ' + email);
  } catch (e) {
    _log('error in fetching objectAttributes : ' + e);
    return false;
  }
  return email;
}

function buildJwt (claims, issuer, audience, jwtType) {

  _log('Building response JWT');

  var signingKey = getKey(config.signingKey, KeyType.SIGNING);
  var signingHandler = new fr.SecretHmacSigningHandler(signingKey);
  var encryptionKey = getKey(config.encryptionKey, KeyType.ENCRYPTION);

  var iat = new Date();
  var iatTime = iat.getTime();

  var jwtClaims = new fr.JwtClaimsSet;
  jwtClaims.setIssuer(issuer);
  jwtClaims.addAudience(audience);
  jwtClaims.setIssuedAtTime(new Date());
  jwtClaims.setExpirationTime(new Date(iatTime + (config.validityMinutes * 60 * 1000)));
  jwtClaims.setClaims(claims);

  var jwt = null;

  switch (jwtType) {

    case JwtType.SIGNED:

      jwt = new fr.JwtBuilderFactory()
        .jws(signingHandler)
        .headers()
        .alg(fr.JwsAlgorithm.HS256)
        .done()
        .claims(jwtClaims)
        .build();
      break;

    case JwtType.SIGNED_THEN_ENCRYPTED:

      jwt = new fr.JwtBuilderFactory()
        .jws(signingHandler)
        .headers()
        .alg(fr.JwsAlgorithm.HS256)
        .done()
        .encrypt(encryptionKey)
        .headers()
        .alg(fr.JweAlgorithm.DIRECT)
        .enc(fr.EncryptionMethod.A128CBC_HS256)
        .done()
        .claims(jwtClaims)
        .build();
      break;

    case JwtType.ENCRYPTED_THEN_SIGNED:

      jwt = new fr.JwtBuilderFactory()
        .jwe(encryptionKey)
        .headers()
        .alg(fr.JweAlgorithm.DIRECT)
        .enc(fr.EncryptionMethod.A128CBC_HS256)
        .done()
        .claims(jwtClaims)
        .signedWith(signingHandler, fr.JwsAlgorithm.HS256)
        .build();
      break;

    default:
      _log('Unknown jwt type ' + jwtType);

  }

  return jwt;
}

//builds the URL which will be sent via email
function buildReturnUrl (jwt) {
  try {
    returnUrl = host.concat('/password-recovery/verify/?token=', jwt);
    _log('URL: ' + returnUrl);
    return returnUrl;
  } catch (e) {
    _log('Error while extracting host: ' + e);
    return false;
  }
}

// raise the generic error callbacks
function raiseGeneralError () {
  if (callbacks.isEmpty()) {
    action = fr.Action.send(
      new fr.HiddenValueCallback(
        'stage',
        'RESET_PASSWORD_ERROR'
      ),
      new fr.TextOutputCallback(
        fr.TextOutputCallback.ERROR,
        'An error has occurred! Please try again later'
      ),
      new fr.HiddenValueCallback(
        'pagePropsJSON',
        JSON.stringify({
          'errors': [{
            label: 'An error has occurred while resetting the password. Please try again later.',
            token: 'RESET_PASSWORD_GENERAL_ERROR'
          }]
        })
      )
    ).build();
  }
}

// raise the email send error callbacks
function raiseEmailSendError () {
  if (callbacks.isEmpty()) {
    action = fr.Action.send(
      new fr.HiddenValueCallback(
        'stage',
        'RESET_PASSWORD_ERROR'
      ),
      new fr.TextOutputCallback(
        fr.TextOutputCallback.ERROR,
        'An error occurred while sending the email. Please try again.'
      ),
      new fr.HiddenValueCallback(
        'pagePropsJSON',
        JSON.stringify({
          'errors': [{
            label: 'An error occurred while sending the email. Please try again.',
            token: 'RESET_PASSWORD_EMAIL_SEND_ERROR'
          }]
        })
      )
    ).build();
  }
}

//send the email
function sendEmail (language) {
  var notifyJWT = transientState.get('notifyJWT');
  var templates = transientState.get('notifyTemplates');
  _log('Notify JWT from transient state: ' + notifyJWT);
  _log('Templates from transient state: ' + templates);
  var isUserExisting = transientState.get('isUserExisting');
  request.setUri(_fromConfig('NOTIFY_EMAIL_ENDPOINT'));
  try {
    var requestBodyJson = isUserExisting ? {
      'email_address': email,
      'template_id': language === 'EN' ? JSON.parse(templates).en_existingUser : JSON.parse(templates).cy_existingUser,
      'personalisation': {
        'link': returnUrl,
        'email': email
      }
    } :
      {
        'email_address': email,
        'template_id': language === 'EN' ? JSON.parse(templates).en_resetPwd : JSON.parse(templates).cy_resetPwd,
        'personalisation': {
          'link': returnUrl
        }
      };

  } catch (e) {
    _log('Error while preparing request for Notify: ' + e);
    return false;
  }

  request.setMethod('POST');
  request.getHeaders().add('Content-Type', 'application/json');
  request.getHeaders().add('Authorization', 'Bearer ' + notifyJWT);
  request.getEntity().setString(JSON.stringify(requestBodyJson));

  var response = httpClient.send(request).get();
  var notificationId;
  _log('Response: ' + response.getStatus().getCode() + ' - ' + response.getCause() + ' - ' + response.getEntity().getString());

  try {
    notificationId = JSON.parse(response.getEntity().getString()).id;
    transientState.put('notificationId', notificationId);
    _log('Notify ID: ' + notificationId);
  } catch (e) {
    _log('Error while parsing Notify response: ' + e);
    return false;
  }

  return (response.getStatus().getCode() === 201);
}

// main execution flow
var FIDC_ENDPOINT = _fromConfig('FIDC_ENDPOINT');
var config = {
  signingKey: transientState.get('chJwtSigningKey'),
  encryptionKey: transientState.get('chJwtEncryptionKey'),
  issuer: FIDC_ENDPOINT,
  audience: 'CH Account',
  validityMinutes: 1440
};

try {
  var request = new org.forgerock.http.protocol.Request();
  var host = _getVariable('esv.c5d3143c84.manualcustomuiurl');
  var now = new Date();
  var language = _getSelectedLanguage(requestHeaders);
  var resetPasswordjJwt;
  var returnUrl;

  var email = extractEmailFromState();
  var pwdResetClaims = {
    subject: email,
    creationDate: now.toString(),
    expirationDate: new Date(now.getTime() + config.validityMinutes * 60 * 1000).toString()
  };

  if (email) {
    resetPasswordjJwt = buildJwt(pwdResetClaims, config.issuer, config.audience, JwtType.SIGNED_THEN_ENCRYPTED);
    if (resetPasswordjJwt) {
      returnUrl = buildReturnUrl(resetPasswordjJwt);
    }
  }

  if (!email || !resetPasswordjJwt || !returnUrl) {
    raiseGeneralError();
  } else {
    if (sendEmail(language)) {
      action = fr.Action.goTo(NodeOutcome.SUCCESS).build();
    } else {
      raiseEmailSendError();
    }
  }

  //always return false at the end, because we don't end up with a session (journey is suspended)
  outcome = NodeOutcome.ERROR;
} catch (e) {
  _log('An error occurred: ' + e);
  sharedState.put('errorMessage', e.toString());
  action = fr.Action.goTo(NodeOutcome.ERROR).build();
}

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END