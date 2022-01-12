var _scriptName = 'CH NOTIFY AUTHORIZED USERS';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  org.forgerock.openam.auth.node.api,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
);

var NodeOutcome = {
  SUCCESS: 'success',
  ERROR: 'error'
};

var Actions = {
  USER_AUTHZ_AUTH_CODE: 'user_added_auth_code',
  AUTHZ_USER_REMOVED: 'user_removed',
  USER_ACCEPT_INVITE: 'user_accepted',
  USER_DECLINE_INVITE: 'user_declined',
  USER_INVITED: 'user_invited'
};

// extracts the user/company from shared state
function extractEventFromState () {
  try {
    var notificationDetails = JSON.parse(sharedState.get('companyNotification'));

    _log('Notification data: ' + sharedState.get('companyNotification'));

    if (!notificationDetails.action || !notificationDetails.companyNumber) {
      _log('Missing params to send email to authz users');
      return false;
    }

    if (!notificationDetails.action === Actions.USER_AUTHZ_AUTH_CODE ||
      !notificationDetails.action === Actions.AUTHZ_USER_REMOVED ||
      !notificationDetails.action === Actions.USER_ACCEPT_INVITE ||
      !notificationDetails.action === Actions.USER_DECLINE_INVITE ||
      !notificationDetails.action === Actions.USER_INVITED ||
      !(notificationDetails.subjectId || notificationDetails.subjectName || notificationDetails.subjectUserName)
    ) {
      _log('Unknown action: ' + notificationDetails.action);
      return false;
    }

    return {
      companyNumber: notificationDetails.companyNumber,
      subjectId: notificationDetails.subjectId,
      subjectName: notificationDetails.subjectName,
      subjectUserName: notificationDetails.subjectUserName,
      actorId: notificationDetails.actorId,
      actorName: notificationDetails.actorName,
      actorUserName: notificationDetails.actorUserName,
      action: notificationDetails.action
    };
  } catch (e) {
    _log('Error in extracting info from state : ' + e);
    return false;
  }
}

// checks whether the user with the given email already exists in IDM
function getUserData (email, id) {
  try {
    var searchTerm = email ? ('/openidm/managed/alpha_user?_queryFilter=userName+eq+%22' + email + '%22') : '/openidm/managed/alpha_user?_queryFilter=_id+eq+%22' + id + '%22';
    _log('User Search term: ' + searchTerm);
    var idmUserEndpoint = FIDC_ENDPOINT.concat(searchTerm);
    var request = new org.forgerock.http.protocol.Request();
    var accessToken = transientState.get('idmAccessToken');

    if (accessToken == null) {
      _log('Access token not in shared state');
      return {
        success: false,
        message: 'Access token not in shared state'
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
        _log('[CHECK USER EXIST] User found: ' + searchResponse.result[0].toString());
        return {
          success: true,
          user: searchResponse.result[0]
        };
      } else {
        _log('User NOT found: ' + email);
        return {
          success: false,
          message: '[CHECK USER EXIST] user NOT found: ' + email
        };
      }
    } else {
      _log('[CHECK USER EXIST] Error while checking user existence: ' + response.getStatus().getCode());
      return {
        success: false,
        message: '[CHECK USER EXIST] Error while checking user existence: ' + response.getStatus().getCode()
      };
    }
  } catch (e) {
    _log('[CHECK USER EXIST] Error : ' + e);
    return {
      success: false,
      message: '[CHECK USER EXIST] Error: ' + e
    };
  }
}

// gets company information
function getCompanyData (companyNo) {
  var request = new org.forgerock.http.protocol.Request();
  var accessToken = transientState.get('idmAccessToken');
  if (accessToken == null) {
    _log('Access token not in shared state');
    return {
      success: false,
      message: '[INVITE USER - GET COMPANY DETAILS] Access token not in shared state'
    };
  }

  var requestBodyJson =
    {
      'companyNumber': companyNo
    };

  request.setMethod('POST');

  _log('Get company details for ' + companyNo);

  request.setUri(idmCompanyAuthEndpoint + '?_action=getCompanyByNumber');
  request.getHeaders().add('Authorization', 'Bearer ' + accessToken);
  request.getHeaders().add('Content-Type', 'application/json');
  request.getHeaders().add('Accept-API-Version', 'resource=1.0');
  request.setEntity(requestBodyJson);

  var response = httpClient.send(request).get();
  var companyResponse = JSON.parse(response.getEntity().getString());

  if (response.getStatus().getCode() === 200) {
    _log('200 response from IDM');

    if (companyResponse.success) {
      return {
        success: true,
        company: companyResponse.company
      };
    } else {
      _log('Error during company lookup: ' + companyResponse.message);
      return {
        success: false,
        message: '[NOTIFY AUTHZ USER - GET COMPANY DETAILS] Error during company lookup: ' + companyResponse.message
      };
    }
  } else {
    _log('Could not get company ' + companyNo + ' - Error ' + response.getEntity().getString());
    return {
      success: false,
      message: '[NOTIFY AUTHZ USER - GET COMPANY DETAILS] Could not get company ' + companyNo + ' - Error ' + response.getEntity().getString()
    };
  }
}

function bodyBuilder (action, recipient, companyName, actorName, subjectName) {
  var templates = transientState.get('notifyTemplates');
  var requestBodyJson;

  if (action === Actions.USER_AUTHZ_AUTH_CODE) {
    requestBodyJson = {
      'email_address': recipient,
      'template_id': JSON.parse(templates).en_notify_user_added_auth_code,
      'personalisation': {
        'company': companyName,
        'actor': actorName
      }
    };
  } else if (action === Actions.AUTHZ_USER_REMOVED) {
    requestBodyJson = {
      'email_address': recipient,
      'template_id': JSON.parse(templates).en_notify_user_removed,
      'personalisation': {
        'company': companyName,
        'actor': actorName,
        'subject': subjectName
      }
    };
  } else if (action === Actions.USER_ACCEPT_INVITE) {
    requestBodyJson = {
      'email_address': recipient,
      'template_id': JSON.parse(templates).en_notify_user_accepted,
      'personalisation': {
        'company': companyName,
        'actor': actorName,
        'subject': subjectName
      }
    };
  } else if (action === Actions.USER_DECLINE_INVITE) {
    requestBodyJson = {
      'email_address': recipient,
      'template_id': JSON.parse(templates).en_notify_user_declined,
      'personalisation': {
        'company': companyName,
        'actor': actorName,
        'subject': subjectName
      }
    };
  } else if (action === Actions.USER_INVITED) {
    requestBodyJson = {
      'email_address': recipient,
      'template_id': JSON.parse(templates).en_notify_user_invited,
      'personalisation': {
        'company': companyName,
        'actor': actorName,
        'subject': subjectName
      }
    };
  }
  return requestBodyJson;
}

//sends the email (via Notify) to the recipient
function sendEmail (action, recipient, companyName, actorName, subjectName) {
  var notifyJWT = transientState.get('notifyJWT');
  var templates = transientState.get('notifyTemplates');
  var request = new org.forgerock.http.protocol.Request();
  var requestBodyJson;

  _log('JWT from transient state: ' + notifyJWT);
  _log('Templates from transient state: ' + templates);

  request.setUri(_fromConfig('NOTIFY_EMAIL_ENDPOINT'));

  try {
    requestBodyJson = bodyBuilder(action, recipient, companyName, actorName, subjectName);
  } catch (e) {
    _log('Error while preparing request for Notify: ' + e);
    return {
      success: false,
      message: '[NOTIFY AUTHZ USER - SEND EMAIL] Error while preparing request for Notify: '.concat(e)
    };
  }

  _log('NOTIFY REQUEST:' + JSON.stringify(requestBodyJson));

  request.setMethod('POST');
  request.getHeaders().add('Content-Type', 'application/json');
  request.getHeaders().add('Authorization', 'Bearer ' + notifyJWT);
  request.setEntity(requestBodyJson);

  var response = httpClient.send(request).get();
  _log('Notify Response: ' + response.getStatus().getCode() + ' - ' + response.getEntity().getString());

  return {
    success: (response.getStatus().getCode() === 201),
    message: (response.getStatus().getCode() === 201) ? ('Message sent') : response.getEntity().getString() + ' - req: ' + JSON.stringify(requestBodyJson) + ' - JWT: ' + notifyJWT
  };
}

function processDisplayNames (notifyEventData) {
  var actorDisplayName;
  var user;
  var subjectDisplayName;

  if (notifyEventData.actorName) {
    actorDisplayName = notifyEventData.actorName;
  } else if (notifyEventData.actorUserName) {
    actorDisplayName = notifyEventData.actorUserName;
  } else if (notifyEventData.actorId) {
    user = getUserData(null, notifyEventData.actorId).user;
    actorDisplayName = user.givenName || user.userName;
  }

  if (notifyEventData.subjectName) {
    subjectDisplayName = notifyEventData.subjectName;
  } else if (notifyEventData.subjectUserName) {
    subjectDisplayName = notifyEventData.subjectUserName;
  } else if (notifyEventData.subjectId) {
    user = getUserData(null, notifyEventData.subjectId).user;
    subjectDisplayName = user.givenName || user.userName;
  }

  return {
    actorDisplayName: String(actorDisplayName),
    subjectDisplayName: String(subjectDisplayName)
  };
}

function isSendToMemberAllowed (companyMemberData, notifyEventData) {
  // do not send a notification email to the same user who accepted the invite
  if (typeof notifyEventData.subjectId !== 'undefined' && notifyEventData.action === Actions.USER_ACCEPT_INVITE && companyMemberData._id === notifyEventData.subjectId) {
    return false;
  }
  return true;
}

// main execution flow
var FIDC_ENDPOINT = _fromConfig('FIDC_ENDPOINT');
var idmCompanyAuthEndpoint = FIDC_ENDPOINT + '/openidm/endpoint/companyauth/';

try {
  var notifyEventData = extractEventFromState();

  if (!notifyEventData) {
    _log('Error while extracting notification input data from shared state - skipping notification email sending.');
  } else {
    var company = getCompanyData(notifyEventData.companyNumber).company;

    if (company) {
      var displayNames = processDisplayNames(notifyEventData);
      var actorName = displayNames.actorDisplayName;
      var subjectName = displayNames.subjectDisplayName;

      var failedEmails = 0;
      var sentEmails = 0;
      var skippedEmails = 0;

      for (var index = 0; index < company.members.length; index++) {
        if (company.members[index].membershipStatus === 'confirmed' && isSendToMemberAllowed(company.members[index], notifyEventData)) {
          _log('Sending email to  : ' + company.members[index].email + ' - ID: ' + company.members[index]._id);
          var sendEmailResult = sendEmail(notifyEventData.action, company.members[index].email, company.name, actorName, subjectName);
          if (!sendEmailResult.success) {
            _log('Error while sending email to : ' + company.members[index].email + ' - error: ' + sendEmailResult.message);
            failedEmails++;
          } else {
            _log('Notification email successfully sent to : ' + company.members[index].email);
            sentEmails++;
          }
        } else {
          if (!isSendToMemberAllowed(company.members[index], notifyEventData)) {
            skippedEmails++;
            _log('The user ' + company.members[index].email + ' is excluded from receiving this company notification - notification email not sent');
          } else {
            _log('The user ' + company.members[index].email + ' is not \'confirmed\' for company - notification email not sent');
          }
        }
      }

      _log(sentEmails + ' authorised company members have been notified via email(s) successfully! Notifications failed: ' + failedEmails + ', skipped: ' + skippedEmails);
    } else {
      _log('Error during company lookup');
    }
  }
  outcome = NodeOutcome.SUCCESS;
} catch (e) {
  _log('Error : ' + e);
  sharedState.put('errorMessage', e.toString());
  outcome = NodeOutcome.ERROR;
}

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END