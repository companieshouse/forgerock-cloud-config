var _scriptName = 'CH PASSWORD RESET VERIFY TOKEN';
_log('Starting', 'MESSAGE');

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

var NodeOutcome = {
  RESUME: 'resume',
  START: 'start',
  ERROR: 'false'
};

function extractTokenParameter () {
  var tokenURLParam = requestParameters.get('token');
  if (!tokenURLParam) {
    return false;
  } else {
    return tokenURLParam.get(0);
  }
}

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

function validatedJwtClaims (jwtString, issuer, jwtType) {

  var jwt = null;
  var verificationKey = getKey(config.signingKey, KeyType.VERIFICATION);
  var decryptionKey = getKey(config.encryptionKey, KeyType.ENCRYPTION);

  switch (jwtType) {
    case JwtType.SIGNED:
      jwt = new fr.JwtBuilderFactory().reconstruct(jwtString, fr.SignedJwt);
      break;

    case JwtType.ENCRYPTED_THEN_SIGNED:
      jwt = new fr.JwtBuilderFactory().reconstruct(jwtString, fr.EncryptedThenSignedJwt);
      jwt.decrypt(decryptionKey);
      break;

    case JwtType.SIGNED_THEN_ENCRYPTED:
      jwt = new fr.JwtBuilderFactory().reconstruct(jwtString, fr.SignedThenEncryptedJwt);
      jwt.decrypt(decryptionKey);
      break;

    default:
      _log('Unknown jwt type ' + jwtType);
      return {
        success: false,
        code: 'ERROR_JWT_TYPE_UNKNOWN',
        message: 'Unknown jwt type ' + jwtType
      };
  }

  var verificationHandler = new fr.SecretHmacSigningHandler(verificationKey);

  if (!jwt.verify(verificationHandler)) {
    _log('JWT signature did not verify');
    return {
      success: false,
      code: 'ERROR_TOKEN_VERIFICATION',
      message: 'JWT signature did not verify'
    };
  }

  var jwtClaims = jwt.getClaimsSet();
  var jwtIssuer = jwtClaims.getIssuer();
  var jwtIssuedAt = jwtClaims.getIssuedAtTime();
  var jwtExpiry = jwtClaims.getExpirationTime();
  var now = new Date();

  if (jwtIssuer != issuer) {
    _log('Issuer in JWT [' + jwtIssuer + '] doesn\'t match expected issuer [' + issuer + ']');
    return {
      success: false,
      code: 'ERROR_TOKEN_ISSUER_MISMATCH',
      message: 'Issuer in JWT [' + jwtIssuer + '] doesn\'t match expected issuer [' + issuer + ']'
    };
  }

  if (jwtIssuedAt.after(now)) {
    _log('JWT issued in the future [' + jwtIssuedAt + ']');
    return {
      success: false,
      code: 'ERROR_TOKEN_ISSUED_IN_FUTURE',
      message: 'JWT issued in the future [' + jwtIssuedAt + ']'
    };
  }

  if (jwtExpiry.before(now)) {
    _log('JWT expired at [' + jwtExpiry + ']');
    return {
      success: false,
      code: 'ERROR_TOKEN_EXPIRED',
      message: 'JWT expired at [' + jwtExpiry + ']'
    };
  }

  return {
    success: true,
    claims: jwtClaims.build()
  };
}

function saveUserDataToState (claimSet) {
  try {
    // put the read attributes in shared state for the Create Object node to consume
    sharedState.put('objectAttributes', { 'userName': claimSet.subject, 'mail': claimSet.subject });
    sharedState.put('userName', claimSet.subject);
    return NodeOutcome.RESUME;
  } catch (e) {
    _log('error while reconstructing JWT: ' + e);
    return NodeOutcome.ERROR;
  }
}

// main execution flow
try {
  var differenceInTime;
  var errorFound = false;
  var tokenURL;
  var FIDC_ENDPOINT = _fromConfig('FIDC_ENDPOINT');
  var config = {
    signingKey: transientState.get('chJwtSigningKey'),
    encryptionKey: transientState.get('chJwtEncryptionKey'),
    issuer: FIDC_ENDPOINT,
    audience: 'CH Account'
  };
  sharedState.put('isResetPassword', true);

  var token = extractTokenParameter();
  if (token) {
    var tokenClaimsResponse = validatedJwtClaims(token, config.issuer, JwtType.SIGNED_THEN_ENCRYPTED);
    if (!tokenClaimsResponse.success) {
      if (callbacks.isEmpty()) {
        action = fr.Action.send(
          new fr.TextOutputCallback(
            fr.TextOutputCallback.ERROR,
            'Error while processing token:'.concat(tokenClaimsResponse.message)
          ),
          new fr.HiddenValueCallback(
            'stage',
            'RESET_PASSWORD_ERROR'
          ),
          new fr.HiddenValueCallback(
            'pagePropsJSON',
            JSON.stringify({
                'errors': [{
                  label: 'An error occurred while parsing the password reset token.',
                  token: 'RESET_PASSWORD_'.concat(tokenClaimsResponse.code)
                }]
              }
            )
          )
        ).build();
      }
    } else {
      outcome = saveUserDataToState(JSON.parse(tokenClaimsResponse.claims));
    }
  } else {
    _log('token not found: starting pwd reset journey');
    outcome = NodeOutcome.START;
  }
} catch (e) {
  _log('ERROR ' + e);
  sharedState.put('errorMessage', e.toString());
  outcome = NodeOutcome.ERROR;
}

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END