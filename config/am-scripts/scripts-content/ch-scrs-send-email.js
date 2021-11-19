var _scriptName = 'CH SCRS SEND EMAIL';

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
  ERROR: 'error',
  SUCCESS: 'success'
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

function buildReturnUrl (email, companyNumber, isNewUser, host) {
  var returnUrl = '';
  var now = new Date();

  if (isNewUser === 'true') {
    var obnboardingClaims = {
      subject: email,
      companyNo: companyNumber,
      creationDate: now.toString(),
      expirationDate: new Date(now.getTime() + config.validityMinutes * 60 * 1000).toString()
    };

    var onboardingJwt = buildJwt(obnboardingClaims, config.issuer, config.audience, JwtType.SIGNED_THEN_ENCRYPTED);

    if (!onboardingJwt) {
      _log('Error while creating Onboarding JWT');

      return {
        success: false,
        message: 'Error while creating Onboarding JWT'
      };
    } else {
      returnUrl = host.concat('/account/onboarding/?token=', onboardingJwt)
        .concat('&goto=', encodeURIComponent('/account/your-companies/'));
    }
  } else {
    returnUrl = host.concat('/account/login/?goto=', encodeURIComponent('/account/your-companies/'));
  }

  return {
    success: true,
    returnUrl: returnUrl
  };
}

function getEmailTemplateId (templates, language, newUser) {
  var templateId;
  var templatesParsed = JSON.parse(templates);

  _log(JSON.stringify(templatesParsed, null, 2));

  if (language === 'EN') {
    if (newUser === 'true') {
      templateId = templatesParsed.en_scrs_notification_new;
    } else {
      templateId = templatesParsed.en_scrs_notification;
    }
  } else {
    if (newUser === 'true') {
      templateId = templatesParsed.cy_scrs_notification_new;
    } else {
      templateId = templatesParsed.cy_scrs_notification;
    }
  }

  _log('TemplateId for : Language = ' + language + ' / New User = ' + newUser + ' -> ' + templateId);
  return templateId;
}

function sendEmail (language, email, companyName, returnUrl, newUser) {
  _log('params: ' + email + ' - ' + companyName + ' (New User = ' + newUser + ')');

  var notifyJWT = transientState.get('notifyJWT');
  var templates = transientState.get('notifyTemplates');

  _log('JWT from transient state: ' + notifyJWT);
  _log('Templates from transient state: ' + templates);
  _log('RETURN URL: ' + returnUrl);

  request.setUri('https://api.notifications.service.gov.uk/v2/notifications/email');
  var requestBodyJson = '';

  try {
    requestBodyJson = {
      'email_address': email,
      'template_id': getEmailTemplateId(templates, language, newUser),
      'personalisation': {
        'link': returnUrl,
        'company': companyName
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

  _log('Notify Response: ' + response.getStatus().getCode() + ' - ' + response.getEntity().getString());

  try {
    notificationId = JSON.parse(response.getEntity().getString()).id;
    transientState.put('notificationId', notificationId);
    _log('Notify ID: ' + notificationId);
  } catch (e) {
    _log('Error while parsing Notify response: ' + e);
    return {
      success: false,
      message: 'Error while parsing Notify response: '.concat(e)
    };
  }

  return {
    success: (response.getStatus().getCode() === 201),
    message: (response.getStatus().getCode() === 201) ? ('Message sent') : response.getEntity().getString()
  };
}

function getHeaderParams (requestHeaders) {
  if (requestHeaders && requestHeaders.get('Chosen-Language')) {
    var lang = requestHeaders.get('Chosen-Language').get(0);
    _log('selected language: ' + lang);
    return lang;
  }
  _log('no selected language found - defaulting to EN');
  return 'EN';
}

function sendErrorCallbacks (token, message) {
  action = fr.Action.send(
    new fr.HiddenValueCallback(
      'stage',
      'REMOVE_AUTHZ_USER_ERROR'
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

var FIDC_ENDPOINT = 'https://openam-companieshouse-uk-dev.id.forgerock.io';

var config = {
  signingKey: transientState.get('chJwtSigningKey'),
  encryptionKey: transientState.get('chJwtEncryptionKey'),
  issuer: FIDC_ENDPOINT,
  audience: 'CH Account',
  validityMinutes: 10080 // 7 days
};

try {
  var request = new org.forgerock.http.protocol.Request();

  var email = sharedState.get('scrsEmail');
  var companyName = sharedState.get('scrsCompanyName');
  var companyNumber = sharedState.get('scrsCompanyNumber');
  var host = sharedState.get('scrsLink');
  var isNewUser = sharedState.get('scrsNewUser');

  var language = getHeaderParams(requestHeaders);

  var returnUrlResponse = buildReturnUrl(email, companyNumber, isNewUser, host);

  if (!returnUrlResponse.success) {
    sendErrorCallbacks('error build URL', returnUrlResponse.message);
  } else {
    var sendEmailResult = sendEmail(language, email, companyName, returnUrlResponse.returnUrl, isNewUser);

    if (sendEmailResult.success) {
      outcome = NodeOutcome.SUCCESS;
    } else {
      sendErrorCallbacks('error send', sendEmailResult.message);
    }
  }
} catch (e) {
  _log('Error : ' + e);

  sharedState.put('errorMessage', e.toString());
  sendErrorCallbacks('error', e.toString());
}

_log('Outcome : ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END