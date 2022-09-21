var _scriptName = 'CH REMOVE USER PROMPT CONFIRMATION';
_log('Starting');

/* 
  ** INPUT DATA
    * QUERY PARAMS
     - companyNo: (optional) the company number to be looked up 

  ** INPUT DATA
    * SHARED STATE:
      - '_id' : the ID of the user performing the operation (session owner/actor)
      - [optional] 'errorMessage': error message to display from previous attempts
      - [optional] 'pagePropsJSON': the JSON props for the UI to display 
  
  ** OUTPUT DATA
    * SHARED STATE: 
      - 'companyData': the company data which has been previously looked up from IDM
      - 'userToRemove': id of the user to remove
      - [optional] 'errorMessage': error message to display from previous attempts
      - [optional] 'pagePropsJSON': the JSON props for the UI to display  
      
  ** OUTCOMES
    - 'confirmed': the user has confirmed the removal
    - 'missing_confirm': the user has tried to confirm removal without acknowledging the information
    - 'cancel': the user has cancelled the operation
    - 'error': an error has happened during processing
*/

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.NameCallback,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback,
  javax.security.auth.callback.ConfirmationCallback,
  org.forgerock.openam.authentication.callbacks.BooleanAttributeInputCallback
);

var NodeOutcome = {
  CONFIRMED: 'confirmed',
  MISSING_CONFIRM: 'missing_confirm',
  CANCEL: 'cancel',
  ERROR: 'error'
};

var ConfirmReadIndex = {
  NO: 'NO',
  YES: 'YES'
};

var ConfirmRemoveIndex = {
  SUBMIT: 0,
  CANCEL: 1
};

var Actions = {
  USER_AUTHZ_AUTH_CODE: 'user_added_auth_code',
  AUTHZ_USER_REMOVED: 'user_removed',
  USER_ACCEPT_INVITE: 'user_accepted',
  USER_INVITED: 'user_invited'
};

function raiseError (message, token) {
  action = fr.Action.send(
    new fr.HiddenValueCallback(
      'stage',
      'REMOVE_AUTHZ_USER_ERROR'
    ),
    new fr.HiddenValueCallback(
      'pagePropsJSON',
      JSON.stringify({
          'errors': [{
            label: message,
            token: token
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

var confirmRemoveCallback = new fr.ConfirmationCallback(
  'Do you want to cancel?',
  fr.ConfirmationCallback.INFORMATION,
  ['SUBMIT', 'CANCEL'],
  ConfirmRemoveIndex.SUBMIT
);

//removes the user from the company
function removeUserFromCompany (callerId, companyNo, userIdToRemove) {
  _log('Removing user ' + userIdToRemove + ' from company ' + companyNo);
  var request = new org.forgerock.http.protocol.Request();
  var accessToken = sharedState.get('idmAccessToken');
  if (accessToken == null) {
    _log('Access token not in shared state');
    return {
      success: false,
      message: 'Access token not in shared state'
    };
  }

  var requestBodyJson =
    {
      'callerId': callerId,
      'subjectId': userIdToRemove,
      'companyNumber': companyNo
    };

  request.setMethod('POST');

  request.setUri(idmCompanyAuthEndpoint + '?_action=removeAuthorisedUser');
  request.getHeaders().add('Authorization', 'Bearer ' + accessToken);
  request.getHeaders().add('Content-Type', 'application/json');
  request.getHeaders().add('Accept-API-Version', 'resource=1.0');
  request.setEntity(requestBodyJson);
  _log('Calling IDM endpoint: ' + idmCompanyAuthEndpoint + '?_action=removeAuthorisedUser');
  var response = httpClient.send(request).get();
  var actionResponse = JSON.parse(response.getEntity().getString());
  if (response.getStatus().getCode() === 200) {
    _log('User removed from company - user: ' + userIdToRemove + ' - company: '+companyNo);
    return {
      success: actionResponse.success,
      removerName: (actionResponse.caller.fullName ? actionResponse.caller.fullName : actionResponse.caller.userName)
    };
  } else {
    _log('Error while removing user from company: ' + response.getEntity().getString());
    return {
      success: false,
      message: actionResponse.detail.reason
    };
  }
}

// execution flow
var idmCompanyAuthEndpoint = _fromConfig('FIDC_ENDPOINT') + '/openidm/endpoint/companyauth/';
try {

  var companyLookupResponse = JSON.parse(sharedState.get('companyData'));
  var userResponse = JSON.parse(sharedState.get('userToRemove'));
  var userStatus = sharedState.get('subjectStatus');
  var sessionOwnerId = sharedState.get('_id');

  if (userStatus === 'pending') {
    // removal logic
    var removeResponse = removeUserFromCompany(sessionOwnerId, companyLookupResponse.number, userResponse._id);
    if (removeResponse.success) {
      sharedState.put('idmAccessToken', null);
      sharedState.put('removerName', removeResponse.removerName);
      action = fr.Action.goTo(NodeOutcome.CONFIRMED).build();
    } else {
      raiseError(removeResponse.message, 'USER_REMOVAL_FAILED');
    }
  } else if (userStatus === 'confirmed') {
    if (callbacks.isEmpty()) {
      var userDisplayName = userResponse.givenName ? userResponse.givenName : userResponse.userName;
      var infoMessage = 'Remove '
        .concat(userDisplayName)
        .concat('\'s authorisation to file online for company ')
        .concat(companyLookupResponse.name);
      var errorMessage = sharedState.get('errorMessage');
      var level = fr.TextOutputCallback.INFORMATION;
      if (errorMessage !== null) {
        var errorProps = sharedState.get('pagePropsJSON');
        level = fr.TextOutputCallback.ERROR;
        infoMessage = errorMessage.concat(' Please confirm you have read the information.');
        var newJSONProps = JSON.parse(errorProps);
        newJSONProps.company = {
          name: companyLookupResponse.name
        };
        newJSONProps.userDisplayName = userDisplayName;
        action = fr.Action.send(
          new fr.TextOutputCallback(level, infoMessage),
          new fr.BooleanAttributeInputCallback('agreement', 'I confirm that I have read and understood this information.', false, true),
          new fr.TextOutputCallback(fr.TextOutputCallback.INFORMATION, 'Do you want to cancel?'),
          confirmRemoveCallback,
          new fr.HiddenValueCallback('stage', 'REMOVE_USER_CONFIRM'),
          new fr.HiddenValueCallback('pagePropsJSON', JSON.stringify(newJSONProps))
        ).build();
      } else {
        var newJSONProps = {
          'company': {
            name: companyLookupResponse.name
          },
          'userDisplayName': userDisplayName
        };
        action = fr.Action.send(
          new fr.TextOutputCallback(level, infoMessage),
          new fr.BooleanAttributeInputCallback('agreement', 'I confirm that I have read and understood this information.', false, true),
          new fr.TextOutputCallback(fr.TextOutputCallback.INFORMATION, 'Do you want to cancel?'),
          confirmRemoveCallback,
          new fr.HiddenValueCallback('stage', 'REMOVE_USER_CONFIRM'),
          new fr.HiddenValueCallback('pagePropsJSON', JSON.stringify(newJSONProps))
        ).build();
      }
    } else {
      var userToRemove = sharedState.get('userToRemove');

      var confirmRead = callbacks.get(1).getValue().toString() == 'true';
      _log('confirm read: ' + confirmRead);

      var confirmRemoveIndex = callbacks.get(3).getSelectedIndex();
      _log('confirm remove: ' + confirmRemoveIndex);

      if (confirmRemoveIndex === ConfirmRemoveIndex.SUBMIT) {
        if (!confirmRead) {
          sharedState.put('errorMessage', 'You need to read the info before proceeding.');
          sharedState.put('pagePropsJSON', JSON.stringify(
            {
              'errors': [{
                label: 'You need to read the info before proceeding.',
                token: 'MISSING_CONFIRM_READ_ERROR',
                fieldName: 'IDToken2',
                anchor: 'IDToken2'
              }]
            }));
          action = fr.Action.goTo(NodeOutcome.MISSING_CONFIRM).build();
        } else {
          // removal logic
          _log('Removing user ' + userResponse._id  + ' from company ' + companyLookupResponse.number);
          var removeResponse = removeUserFromCompany(sessionOwnerId, companyLookupResponse.number, userResponse._id);
          if (removeResponse.success) {

            var companyNotificationData = {
              'companyNumber': String(companyLookupResponse.number),
              'subjectId': String(userResponse._id),
              'actorId': String(sessionOwnerId),
              'action': String(Actions.AUTHZ_USER_REMOVED)
            };
            sharedState.put('companyNotification', JSON.stringify(companyNotificationData));

            sharedState.put('idmAccessToken', null);
            sharedState.put('removerName', removeResponse.removerName);
            action = fr.Action.goTo(NodeOutcome.CONFIRMED).build();
          } else {
            _log('Failed to Remove user ' + userResponse._id + ' from company ' + companyNo + ': ' + removeResponse.message);
            raiseError(removeResponse.message, 'USER_REMOVAL_FAILED');
          }
        }
      } else {
        _log('Remove action canceled');
        action = fr.Action.goTo(NodeOutcome.CANCEL).build();
      }
    }
  } else {
    _log('User ' + userResponse._id + 'is not confirmed or invited for company ' + companyLookupResponse);
    sharedState.put('errorMessage', '[REMOVE AUTHZ USER - REMOVE] User ' + userResponse._id + 'is not confirmed or invited for company ' + companyLookupResponse.name);
    action = fr.Action.goTo(NodeOutcome.ERROR).build();
  }
} catch (e) {
  _log('ERROR: ' + e);
  sharedState.put('errorMessage', '[REMOVE AUTHZ USER - REMOVE] ' + e.toString());
  action = fr.Action.goTo(NodeOutcome.ERROR).build();
}

// LIBRARY START
// LIBRARY END