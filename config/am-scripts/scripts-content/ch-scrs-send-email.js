var _scriptName = 'CH SCRS SEND EMAIL';
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
  ERROR: 'error',
  SUCCESS: 'success'
};

function buildOnboardingParams (userId, linkTokenId, companyNumber) {
  return '_id=' + encodeURIComponent(userId) + '&tokenId=' + encodeURIComponent(linkTokenId) + '&companyNo=' + encodeURIComponent(companyNumber);
}

function buildReturnUrl (email, companyNumber, isNewUser, host, userId, linkTokenId) {
  _log('Starting buildReturnUrl');

  var onboardingParams = buildOnboardingParams(userId, linkTokenId, companyNumber);

  _log('Onboarding params : ' + onboardingParams, 'MESSAGE');

  if (onboardingParams) {
    var returnUrl = host.concat('/account/scrs/?', onboardingParams)
      .concat('&goto=', encodeURIComponent('/account/home/?companyNo=' + companyNumber + '&scrsUserType=' + (isNewUser ? 'new' : 'existing')), '&scrsUserType=', encodeURIComponent(isNewUser ? 'new' : 'existing'));

    _log('Onboarding Url : ' + returnUrl, 'MESSAGE');

    return {
      success: true,
      returnUrl: returnUrl
    };

  } else {
    _log('Error while creating Onboarding Params');

    return {
      success: false,
      message: 'Error while creating Onboarding Params'
    };
  }
}

function getEmailTemplateId (templates, newUser) {
  var templateId;
  var templatesParsed = JSON.parse(templates);

  _log(JSON.stringify(templatesParsed, null, 2), 'MESSAGE');

  if (String(newUser) === 'true') {
    templateId = templatesParsed.en_scrs_notification_new;
  } else {
    templateId = templatesParsed.en_scrs_notification;
  }

  return templateId;
}

function sendEmail (email, companyName, returnUrl, newUser) {
  _log('params: ' + email + ' - ' + companyName + ' (New User = ' + newUser + ')', 'MESSAGE');

  var notifyJWT = transientState.get('notifyJWT');
  var templates = transientState.get('notifyTemplates');

  _log('JWT from transient state: ' + notifyJWT, 'MESSAGE');
  _log('Templates from transient state: ' + templates);
  _log(email + ' => RETURN URL: ' + returnUrl);

  request.setUri(_fromConfig('NOTIFY_EMAIL_ENDPOINT'));
  var requestBodyJson = '';

  try {
    requestBodyJson = {
      'email_address': email,
      'template_id': getEmailTemplateId(templates, newUser),
      'personalisation': {
        'link': returnUrl,
        'company': companyName,
        'subject': email
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

  // _log('Notify Response: ' + response.getStatus().getCode() + ' - ' + response.getEntity().getString());
  _log('Notify Response: ' + response.getStatus().getCode());

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

var FIDC_ENDPOINT = _fromConfig('FIDC_ENDPOINT');

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
  var userId = sharedState.get('scrsUserId');
  var linkTokenId = sharedState.get('scrsLinkTokenUuid');

  var returnUrlResponse = buildReturnUrl(email, companyNumber, isNewUser, host, userId, linkTokenId);

  if (!returnUrlResponse.success) {
    sendErrorCallbacks('error build URL', returnUrlResponse.message);
  } else {
    var sendEmailResult = sendEmail(email, companyName, returnUrlResponse.returnUrl, isNewUser);

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