var _scriptName = 'CH ONBOARDING VERIFY TOKEN';
_log('Starting');

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
  org.forgerock.secrets.SecretBuilder,
  javax.crypto.spec.SecretKeySpec,
  org.forgerock.secrets.keys.SigningKey,
  org.forgerock.secrets.keys.VerificationKey,
  org.forgerock.json.jose.jws.handlers.SecretHmacSigningHandler,
  org.forgerock.util.encode.Base64,
  java.time.temporal.ChronoUnit,
  java.time.Clock
);

var NodeOutcome = {
  SUCCESS: 'true',
  ERROR: 'false'
};

var MembershipStatus = {
  CONFIRMED: 'confirmed',
  PENDING: 'pending',
  NONE: 'none'
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

var FIDC_ENDPOINT = _fromConfig('FIDC_ENDPOINT');

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

function extractTokenParameter () {
  var tokenURLParam = requestParameters.get('token');
  if (!tokenURLParam) {
    if (callbacks.isEmpty()) {
      action = fr.Action.send(
        new fr.HiddenValueCallback(
          'stage',
          'ONBOARDING_ERROR'
        ),
        new fr.HiddenValueCallback(
          'pagePropsJSON',
          JSON.stringify({
              'errors': [{
                label: 'No Onboarding Token found in request.',
                token: 'ONBOARDING_NO_TOKEN_ERROR'
              }]
            }
          ),
          new fr.TextOutputCallback(
            fr.TextOutputCallback.ERROR,
            'Token parameter not found')
        )
      ).build();
      return false;
    }
  } else {
    return tokenURLParam.get(0);
  }
}

//fetches the IDM access token from transient state
function fetchIDMToken () {
  var ACCESS_TOKEN_STATE_FIELD = 'idmAccessToken';
  var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);
  if (accessToken === null) {
    _log('Access token not in transient state');
    return false;
  }
  return accessToken;
}

//checks whether the user with the given email already exists in IDM
function lookupUser (email) {
  try {
    var idmUserEndpoint = FIDC_ENDPOINT + '/openidm/managed/alpha_user?_queryFilter=userName+eq+%22' + email + '%22';
    var request = new org.forgerock.http.protocol.Request();
    var accessToken = fetchIDMToken();
    if (!accessToken) {
      _log('Access token not in transient state');
      return {
        success: false,
        error: 'Access token not in transient state'
      };
    }

    request.setMethod('GET');
    request.setUri(idmUserEndpoint);
    request.getHeaders().add('Authorization', 'Bearer ' + accessToken);
    request.getHeaders().add('Content-Type', 'application/json');
    request.getHeaders().add('Accept-API-Version', 'resource=1.0');

    var response = httpClient.send(request).get();

    if (response.getStatus().getCode() === 200) {
      var searchResponse = JSON.parse(response.getEntity().getString());
      if (searchResponse && searchResponse.result && searchResponse.result.length > 0) {
        _log('user found: ' + searchResponse.result[0].toString());
        return {
          success: true,
          user: searchResponse.result[0]
        };
      } else {
        _log('user NOT found: ' + email);
        return {
          success: true,
          user: null
        };
      }
    } else {
      _log('Error while looking up user: ' + response.getStatus().getCode());
      return {
        success: false,
        error: 'Error while looking up user: ' + response.getStatus().getCode()
      };
    }
  } catch (e) {
    _log(e);
    return {
      success: false,
      error: 'Error while checking user existence: ' + e.toString()
    };
  }
}

// extracts the user membership status to the given company. User could be provided as a user ID or a username (email) 
function isUserInvitedForCompany (userEmail, companyNo) {
  var request = new org.forgerock.http.protocol.Request();
  var accessToken = transientState.get('idmAccessToken');
  var idmCompanyAuthEndpoint = FIDC_ENDPOINT + '/openidm/endpoint/companyauth?_action=getCompanyStatusByUsername';
  if (accessToken === null) {
    _log('Access token not in transient state');
    return {
      success: false,
      error: 'Access token not in transient state'
    };
  }

  var requestBodyJson = {
    'subjectUserName': userEmail,
    'companyNumber': companyNo
  };

  request.setMethod('POST');
  _log('Check user ' + userEmail + ' membership status to company ' + companyNo);
  request.setUri(idmCompanyAuthEndpoint);
  request.getHeaders().add('Authorization', 'Bearer ' + accessToken);
  request.getHeaders().add('Content-Type', 'application/json');
  request.getHeaders().add('Accept-API-Version', 'resource=1.0');
  request.setEntity(requestBodyJson);

  var response = httpClient.send(request).get();

  if (response.getStatus().getCode() === 200) {
    var membershipResponse = JSON.parse(response.getEntity().getString());
    return {
      success: true,
      companyName: membershipResponse.company.name,
      isPending: (membershipResponse.company.status === MembershipStatus.PENDING)
    };
  } else {
    _log('Error during relationship check');
    return {
      success: false,
      error: 'Error during relationship check - ' + response.getStatus().getCode()
    };
  }
}

function extractInfoFromToken (claimSet) {
  try {
    var email = claimSet.subject;
    var companyNo = claimSet.companyNo;
    _log('initiating email: ' + email + ' - companyNo: ' + companyNo);
    return {
      email: email,
      companyNo: companyNo
    };
  } catch (e) {
    _log('error while reconstructing JWT: ' + e);
    return false;
  }
}

function raiseError (message, token) {
  if (callbacks.isEmpty()) {
    action = fr.Action.send(
      new fr.HiddenValueCallback(
        'stage',
        'ONBOARDING_ERROR'
      ),
      new fr.HiddenValueCallback(
        'pagePropsJSON',
        JSON.stringify(
          {
            'errors': [{
              label: message,
              token: token,
            }]
          }
        )
      ),
      new fr.TextOutputCallback(
        fr.TextOutputCallback.ERROR,
        message
      )
    ).build();
  }
}

function saveUserDataToState (tokenData, companyName) {
  _log('The provided token is still valid');
  try {
    // put the read attributes in shared state for the Create Object node to consume
    sharedState.put('objectAttributes',
      {
        'userName': tokenData.email,
        'sn': tokenData.email,
        'mail': tokenData.email
      });
    sharedState.put('userName', tokenData.email);
    sharedState.put('invitedCompanyName', companyName);
    sharedState.put('isOnboarding', true);
    return NodeOutcome.SUCCESS;
  } catch (e) {
    _log('error while storing state: ' + e);
    return NodeOutcome.ERROR;
  }
}

// reads the onboarding date
function validateOnboardingDate (user) {

  var onboardDate = user.frIndexedDate2;
  if (!onboardDate) {
    _log('Onboarding date not found for user ' + user._id);
    return false;
  }

  _log('onboarding date: ' + onboardDate);

  if (onboardDate.length > 0) {
    var onboardDateUTC = _convertStringToDateTime(onboardDate);

    var now = new Date();

    var intervalDays = 7;
    var intervalInMillis = intervalDays * 86400 * 1000;

    var delta = now.getTime() - onboardDateUTC; // Difference in ms
    if (delta > intervalInMillis) {
      _log('Onboarding date is older than ' + intervalDays + ' days');
      return false;
    } else {
      _log('Onboarding date valid');
      return true;
    }
  }
}

//main execution flow
try {
  var config = {
    signingKey: transientState.get('chJwtSigningKey'),
    encryptionKey: transientState.get('chJwtEncryptionKey'),
    issuer: FIDC_ENDPOINT,
    audience: 'CH Account'
  };
  if (_isAuthenticated()) {
    if (callbacks.isEmpty()) {
      action = fr.Action.send(
        new fr.HiddenValueCallback(
          'stage',
          'ONBOARDING_ERROR'
        ),
        new fr.TextOutputCallback(
          fr.TextOutputCallback.ERROR,
          'An active session was found - You must terminate all active sessions to proceed with this operation'
        ),
        new fr.HiddenValueCallback(
          'pagePropsJSON',
          JSON.stringify({
            'errors': [
              {
                label: 'An active session was found - You must terminate all active sessions to proceed with this operation',
                token: 'ACTIVE_SESSION_ERROR'
              }]
          })
        )
      ).build();
    }
  } else {
    var token = extractTokenParameter();
    sharedState.put('isOnboarding', true);
    if (token) {
      //var tokenData = extractInfoFromToken(token);
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
              'ONBOARDING_ERROR'
            ),
            new fr.HiddenValueCallback(
              'pagePropsJSON',
              JSON.stringify({
                'errors': [
                  {
                    label: 'An error occurred while parsing the onboarding token.',
                    token: 'ONBOARDING_'.concat(tokenClaimsResponse.code)
                  }]
              })
            )
          ).build();
        }
      } else {
        var tokenData = extractInfoFromToken(JSON.parse(tokenClaimsResponse.claims));

        var userResponse = lookupUser(tokenData.email);

        if (!userResponse.success) {
          raiseError(userResponse.error, 'ONBOARDING_USER_LOOKUP_ERROR');
        } else if (!userResponse.user) {
          raiseError('The invited user does not exist.', 'ONBOARDING_USER_NOT_FOUND_ERROR');
        } else {
          var isUserInvited = isUserInvitedForCompany(tokenData.email, tokenData.companyNo);
          if (!isUserInvited.success) {
            raiseError(isUserInvited.error, 'ONBOARDING_USER_LOOKUP_ERROR');
          } else if (!isUserInvited.isPending) {
            raiseError('The user is not invited for the company', 'ONBOARDING_NO_INVITE_FOUND_ERROR');
          } else if (!validateOnboardingDate(userResponse.user)) {
            raiseError('The onboarding date is not found or is expired.', 'ONBOARDING_DATE_EXPIRED_ERROR');
          } else {
            outcome = saveUserDataToState(tokenData, isUserInvited.companyName);
          }
        }
      }
    }
    outcome = NodeOutcome.SUCCESS;
  }
} catch (e) {
  _log('error ' + e);
  sharedState.put('errorMessage', e.toString());
  outcome = NodeOutcome.ERROR;
}

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END