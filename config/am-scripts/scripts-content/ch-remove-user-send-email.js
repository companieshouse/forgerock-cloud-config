var _scriptName = 'CH REMOVE USER SEND EMAIL';
_log('Starting');

/* 
  ** INPUT DATA
    * SHARED STATE:
      - 'companyData': the company data which has been previously looked up from IDM
      - 'userToRemove': id of the user to remove

    * TRANSIENT STATE
      - 'notifyJWT': the Notify JWT to be used for requests to Notify
      - 'notifyTemplates': the list of all Notify templates 

  ** OUTPUT DATA
    * TRANSIENT STATE:
      - 'notificationId': the notification ID returned by Notify if the call was successful
    
  ** OUTCOMES
    - true: message sent successfully or failure

  ** CALLBACKS:
    - email sent successfully

*/

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  org.forgerock.openam.auth.node.api,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
);

var NodeOutcome = {
  SUCCESS: 'true'
};

// extracts the user/company from shared state
function extractRemovalDataFromState () {
  try {
    var companyData = sharedState.get('companyData');
    var userToRemove = JSON.parse(sharedState.get('userToRemove'));
    var removerName = sharedState.get('removerName');
    var displayName = userToRemove.givenName ? userToRemove.givenName : userToRemove.userName;
    return {
      companyName: JSON.parse(companyData).name,
      removerName: removerName,
      userToRemove: userToRemove.userName,
      displayName: displayName
    };
  } catch (e) {
    _log('error in fetching objectAttributes : ' + e);
    return false;
  }
}

//raises a generic error
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

//sends the email (via Notify) to the recipient using the given JWT
function sendEmail (language, removerName, userToRemove, companyName) {

  _log('params: company name:' + companyName);

  var notifyJWT = transientState.get('notifyJWT');
  var templates = transientState.get('notifyTemplates');

  _log('JWT from transient state: ' + notifyJWT);
  _log('Templates from transient state: ' + templates);

  request.setUri('https://api.notifications.service.gov.uk/v2/notifications/email');
  try {
    var requestBodyJson = {
      'email_address': userToRemove,
      'template_id': language === 'EN' ? JSON.parse(templates).en_removal : JSON.parse(templates).cy_removal,
      'personalisation': {
        'company': companyName,
        'remover': removerName
      }
    };
  } catch (e) {
    _log('Error while preparing request for Notify: ' + e);
    return {
      success: false,
      message: '[REMOVE AUTHZ USER - SEND EMAIL] Error while preparing request for Notify: '.concat(e)
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
      message: '[REMOVE AUTHZ USER - SEND EMAIL] Error while parsing Notify response: '.concat(e)
    };
  }

  return {
    success: (response.getStatus().getCode() === 201),
    message: (response.getStatus().getCode() === 201) ? ('Message sent') : response.getEntity().getString()
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

// main execution flow
try {
  var request = new org.forgerock.http.protocol.Request();
  var removalData = extractRemovalDataFromState();
  var language = getSelectedLanguage(requestHeaders);

  if (!removalData) {
    sendErrorCallbacks('REMOVE_AUTHZ_USER_ERROR', 'Error while extracting data from shared state');
  } else {
    var sendEmailResult = sendEmail(language, removalData.removerName, removalData.userToRemove, removalData.companyName);
    var userDisplayName = removalData.displayName;
    var notificationId = transientState.get('notificationId');

    if (callbacks.isEmpty()) {
      action = fr.Action.send(
        new fr.TextOutputCallback(
          fr.TextOutputCallback.INFORMATION,
          userDisplayName.concat(' is no longer authorised to file online for ', removalData.companyName)
        ),
        new fr.HiddenValueCallback(
          'stage',
          'REMOVAL_CONFIRMATION'
        ),
        new fr.HiddenValueCallback(
          'pagePropsJSON',
          JSON.stringify(
            {
              'user': userDisplayName,
              'company': removalData.companyName
            })
        ),
        new fr.HiddenValueCallback(
          'notificationId',
          notificationId
        ),
        new fr.HiddenValueCallback(
          'emailSent',
          sendEmailResult.success
        )
      ).build();
    }
  }
} catch (e) {
  _log('Error : ' + e);
  sendErrorCallbacks('REMOVE_AUTHZ_USER_ERROR', e);
}

// LIBRARY START
// LIBRARY END