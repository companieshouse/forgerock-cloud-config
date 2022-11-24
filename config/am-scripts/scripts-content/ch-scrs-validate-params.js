var _scriptName = 'CH SCRS VALIDATE PARAMS';
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

function getHeaderParams (requestHeaders) {
  _log('Getting Header Params');

  var username, pwd, link, email, companyName, companyNumber, newUser, userId, linkTokenUuid, language;

  if (!requestHeaders) {
    return {
      success: false,
      message: 'no headers'
    };
  }

  _log('We have headers');

  var headerChUsername = 'ch-username';
  var headerChPassword = 'ch-password';
  var headerNotificationLink = 'notification-link';
  var headerNotificationEmail = 'notification-email';
  var headerNewUser = 'new-user';
  var headerNotificationCompanyName = 'notification-company-name';
  var headerNotificationCompanyNumber = 'notification-company-number';
  var headerNotificationLanguage = 'notification-language';
  var headerNotificationUserId = 'notification-user-id';
  var headerNotificationTokenUuid = 'notification-token-uuid';

  _log('Getting individual headers');

  if (requestHeaders.get(headerChUsername)) {
    username = requestHeaders.get(headerChUsername).get(0);
  }

  if (requestHeaders.get(headerChPassword)) {
    pwd = requestHeaders.get(headerChPassword).get(0);
  }

  if (requestHeaders.get(headerNotificationLink)) {
    link = requestHeaders.get(headerNotificationLink).get(0);
  }

  if (requestHeaders.get(headerNotificationEmail)) {
    email = requestHeaders.get(headerNotificationEmail).get(0);
  }

  if (requestHeaders.get(headerNewUser)) {
    newUser = (String(requestHeaders.get(headerNewUser).get(0)) === 'true');
  }

  if (requestHeaders.get(headerNotificationCompanyName)) {
    companyName = requestHeaders.get(headerNotificationCompanyName).get(0);
  }

  if (requestHeaders.get(headerNotificationCompanyNumber)) {
    companyNumber = requestHeaders.get(headerNotificationCompanyNumber).get(0);
  }

  if (requestHeaders.get(headerNotificationLanguage)) {
    language = requestHeaders.get(headerNotificationLanguage).get(0);
  }

  if (requestHeaders.get(headerNotificationUserId)) {
    userId = requestHeaders.get(headerNotificationUserId).get(0);
  }

  if (requestHeaders.get(headerNotificationTokenUuid)) {
    linkTokenUuid = requestHeaders.get(headerNotificationTokenUuid).get(0);
  }

  _log('Got individual headers');

  if ((!username || !username.equals('tree-service-user@companieshouse.gov.uk')) ||
    !pwd ||
    !link ||
    !email ||
    !companyName ||
    !companyNumber ||
    !language ||
    !userId ||
    !linkTokenUuid) {

    _log('Returning false as missing information');

    return {
      success: false,
      message: String(requestHeaders) + ' --- ' + username + ' ' + pwd + ' ' + link + ' ' + email + ' ' + companyName + ' ' + companyNumber
    };
  }

  _log('About to return');
  _log('Headers : ' + String(requestHeaders) + ' --- ' + username + ' ' + pwd + ' ' + link + ' ' + email + ' ' + companyName + ' ' + companyNumber, 'MESSAGE');

  return {
    success: true,
    data: {
      username: username,
      password: pwd,
      link: link,
      email: email,
      language: language,
      companyName: companyName,
      companyNumber: companyNumber,
      newUser: newUser,
      userId: userId,
      linkTokenUuid: linkTokenUuid
    }
  };
}

var FIDC_ENDPOINT = _fromConfig('FIDC_ENDPOINT');

try {
  _log('Validating SCRS Params');

  var request = new org.forgerock.http.protocol.Request();
  var paramsObj = getHeaderParams(requestHeaders);

  if (!paramsObj.success) {

    _log('ParamsObj has a failure');

    sharedState.put('errorMessage', 'SCRS - Error in validating parameters - ' + paramsObj.message);
    outcome = NodeOutcome.ERROR;

  } else {

    _log('ParamsObj shows success');

    sharedState.put('username', paramsObj.data.username);
    sharedState.put('password', paramsObj.data.password);
    sharedState.put('scrsEmail', paramsObj.data.email);
    sharedState.put('scrsLanguage', paramsObj.data.language);
    sharedState.put('scrsLink', paramsObj.data.link);
    sharedState.put('scrsCompanyName', paramsObj.data.companyName);
    sharedState.put('scrsCompanyNumber', paramsObj.data.companyNumber);
    sharedState.put('scrsNewUser', paramsObj.data.newUser);
    sharedState.put('scrsUserId', paramsObj.data.userId);
    sharedState.put('scrsLinkTokenUuid', paramsObj.data.linkTokenUuid);

    outcome = NodeOutcome.SUCCESS;
  }
} catch (e) {
  _log('Error : ' + e);
  sharedState.put('errorMessage', e.toString());
  outcome = NodeOutcome.ERROR;
}

_log('Outcome : ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END