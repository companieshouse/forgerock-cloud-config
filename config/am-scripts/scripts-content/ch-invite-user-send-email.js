/* 
  ** INPUT DATA
    * SHARED STATE:
      - 'companyData': the company data which has been previously looked up from IDM
      - '_id': id of the current user (session owner)
      - 'email': email of the invited user
      - 'inviterName': the full name of the inviter (or email of name is not set)

    * TRANSIENT STATE
      - 'notifyJWT': the Notify JWT to be used for requests to Notify
      - 'notifyTemplates': the list of all Notify templates 

  ** OUTPUT DATA
    * TRANSIENT STATE:
      - 'notificationId': the notification ID returned by Notify if the call was successful
    
  ** OUTCOMES
    - true: message sent successfully
  
  ** CALLBACKS:
    - error while sending 
    - generic error
*/

var _scriptName = 'COMPANY INVITE SEND EMAIL';
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
  ERROR: 'false',
  SUCCESS: 'true'
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

var Actions = {
  USER_AUTHZ_AUTH_CODE: 'user_added_auth_code',
  AUTHZ_USER_REMOVED: 'user_removed',
  USER_ACCEPT_INVITE: 'user_accepted',
  USER_INVITED: 'user_invited'
};

function getKey (secret, keyType) {
  if (keyType === KeyType.ENCRYPTION) {
    return new fr.SecretKeySpec(fr.Base64.decode(config.encryptionKey), 'AES');
  } else {
    var secretBytes = fr.Base64.decode(secret);
    var secretBuilder = new fr.SecretBuilder;
    secretBuilder.secretKey(new javax.crypto.spec.SecretKeySpec(secretBytes, 'Hmac'));
    secretBuilder.stableId(config.issuer).expiresIn(5, fr.ChronoUnit.MINUTES, fr.Clock.systemUTC());
    return (keyType === KeyType.SIGNING) ? new fr.SigningKey(secretBuilder) : new fr.VerificationKey(secretBuilder);
  }
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

// extracts the email from shared state
function extractInviteDataFromState () {
  try {
    var inviterUserId = sharedState.get('_id');
    var inviterName = sharedState.get('inviterName');
    var invitedEmail = sharedState.get('email');
    var companyData = sharedState.get('companyData');
    return {
      invitedEmail: invitedEmail,
      inviterUserId: inviterUserId,
      inviterName: inviterName,
      companyNumber: JSON.parse(companyData).number,
      companyName: JSON.parse(companyData).name
    };
  } catch (e) {
    _log('error in fetching objectAttributes : ' + e);
    return false;
  }
}

//raises a generic error
function sendErrorCallbacks (stage, token, message) {
  if (callbacks.isEmpty()) {
    action = fr.Action.send(
      new fr.HiddenValueCallback(
        'stage',
        stage
      ),
      new fr.TextOutputCallback(
        fr.TextOutputCallback.ERROR,
        message
      ),
      new fr.HiddenValueCallback(
        'pagePropsJSON',
        JSON.stringify({ 'errors': [{ label: message, token: token }] })
      )
    ).build();
  }
}

//builds an onboarding JWT (if necessary) and assemble the return URL
function buildReturnUrl (invitedEmail, companyNumber) {

  var returnUrl = '';
  var now = new Date();
  if (isOnboarding) {
    var obnboardingClaims = {
      subject: invitedEmail,
      companyNo: companyNumber,
      creationDate: now.toString(),
      expirationDate: new Date(now.getTime() + config.validityMinutes * 60 * 1000).toString()
    };
    var onboardingJwt = buildJwt(obnboardingClaims, config.issuer, config.audience, JwtType.SIGNED_THEN_ENCRYPTED);
    //onboardingJwtResponse = buildOnboardingToken(invitedEmail, companyNumber);
    if (!onboardingJwt) {
      _log('Error while creating Onboarding JWT');
      return {
        success: false,
        message: 'Error while creating Onboarding JWT'
      };
    } else {
      returnUrl = host.concat('/account/onboarding/?token=', onboardingJwt)
        .concat('&goto=', encodeURIComponent('/account/notifications/?companyNumber=' + companyNumber));
    }
  } else {
    returnUrl = host.concat('/account/login/?goto=', encodeURIComponent('/account/notifications/?companyNumber=' + companyNumber));
  }
  return {
    success: true,
    returnUrl: returnUrl
  };
}

//sends the email (via Notify) to the recipient using the given JWT
function sendEmail (language, invitedEmail, companyName, inviterName, returnUrl) {

  _log('params: ' + invitedEmail + ' - ' + companyName + ' - ' + inviterName);

  var notifyJWT = transientState.get('notifyJWT');
  var templates = transientState.get('notifyTemplates');

  _log('JWT from transient state: ' + notifyJWT);
  _log('Templates from transient state: ' + templates);
  _log('RETURN URL: ' + returnUrl);

  request.setUri('https://api.notifications.service.gov.uk/v2/notifications/email');
  try {
    var requestBodyJson = {
      'email_address': invitedEmail,
      'template_id': language === 'EN' ? JSON.parse(templates).en_invite : JSON.parse(templates).cy_invite,
      'personalisation': {
        'link': returnUrl,
        'company': companyName,
        'inviter': inviterName
      }
    };
  } catch (e) {
    _log('Error while preparing request for Notify: ' + e);
    return {
      success: false,
      message: 'Error while preparing request for Notify: '.concat(e)
    };
  }

  request.setMethod('POST');
  request.getHeaders().add('Content-Type', 'application/json');
  request.getHeaders().add('Authorization', 'Bearer ' + notifyJWT);
  request.setEntity(requestBodyJson);

  var response = httpClient.send(request).get();
  var notificationId;
  var notifyErrorMessage;
  _log('Notify Response: ' + response.getStatus().getCode() + ' - ' + response.getEntity().getString());

  try {
    notificationId = JSON.parse(response.getEntity().getString()).id;
  } catch (e) {
    _log('Error while parsing Notify response: ' + e);
    return {
      success: false,
      message: '[COMPANY INVITE - SEND EMAIL] Error while parsing Notify response: '.concat(e)
    };
  }

  if (response.getStatus().getCode() === 201) {
    transientState.put('notificationId', notificationId);
    _log('Notify ID: ' + notificationId);
  } else {
    if (JSON.parse(response.getEntity().getString()).errors.length > 0) {
      notifyErrorMessage = JSON.parse(response.getEntity().getString()).errors[0].message;
    }
    _log('Email not sent');
  }

  return {
    success: (response.getStatus().getCode() === 201),
    message: (response.getStatus().getCode() === 201) ? ('Message sent') : notifyErrorMessage
  };
}

//extracts the language form headers (default to EN)
function getSelectedLanguage (requestHeaders) {
  if (requestHeaders && requestHeaders.get('Chosen-Language')) {
    var lang = requestHeaders.get('Chosen-Language').get(0);
    _log('selected language: ' + lang);
    return lang;
  }
  _log('no selected language found - defaulting to EN');
  return 'EN';
}

var FIDC_ENDPOINT = 'https://openam-companieshouse-uk-dev.id.forgerock.io';

// main execution flow
var config = {
  signingKey: transientState.get('chJwtSigningKey'),
  encryptionKey: transientState.get('chJwtEncryptionKey'),
  issuer: FIDC_ENDPOINT,
  audience: 'CH Account',
  validityMinutes: 10080 //7 days
};

try {
  var host = requestHeaders.get('origin').get(0);
  var request = new org.forgerock.http.protocol.Request();
  var isOnboarding = sharedState.get('isOnboarding');
  var inviteData = extractInviteDataFromState();
  var language = getSelectedLanguage(requestHeaders);

  if (!inviteData) {
    sendErrorCallbacks('INVITE_USER_ERROR', 'INVITE_USER_ERROR', 'An error has occurred! Please try again later.');
  } else {
    var returnUrlResponse = buildReturnUrl(inviteData.invitedEmail, inviteData.companyNumber);
    if (!returnUrlResponse.success) {
      sendErrorCallbacks('INVITE_USER_ERROR', 'INVITE_USER_ERROR', returnUrlResponse.message);
    } else {
      var sendEmailResult = sendEmail(language, inviteData.invitedEmail, inviteData.companyName, inviteData.inviterName, returnUrlResponse.returnUrl);
      if (sendEmailResult.success) {

        var companyNotificationData = {
          'companyNumber': String(inviteData.companyNumber),
          'subjectUserName': String(inviteData.invitedEmail),
          'actorId': String(inviteData.inviterUserId),
          'action': String(Actions.USER_INVITED)
        };
        sharedState.put('companyNotification', JSON.stringify(companyNotificationData));

        action = fr.Action.goTo(NodeOutcome.SUCCESS).build();
      } else {
        sendErrorCallbacks('INVITE_USER_ERROR', 'INVITE_USER_ERROR', sendEmailResult.message);
      }
    }
  }
} catch (e) {
  _log('Error : ' + e);
  sendErrorCallbacks('INVITE_USER_ERROR', 'INVITE_USER_ERROR', e);
}

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END