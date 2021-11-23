/*
  ** INPUT DATA
    * QUERY PARAMETERS
      - 'action': the desired action for the company invite: accept, reject, send (implicit)
    * SHARED STATE:
      - 'companyData' : the company data which has been fetched
      - '_id': session owner ID
      - 'invitedEmail': the invitee email address

    * TRANSIENT STATE
      - 'idmAccessToken': the IDM access token

  ** OUTPUT DATA
    * SHARED STATE:
      - 'errorMessage': the error message to be displayed
      - 'pagePropsJSON': the JSON props for the UI

  ** OUTCOMES
    - skip_respond_invite: skip the responding logic, and proceed to sending the invite
    - error: an error occurred
  ** CALLBACKS:
    - output: confirmation of executed action
    - output: stage name and page props for UI
*/

var _scriptName = 'CH INVITE USER RESPOND INVITE';
_log('Started');

var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback
);

var NodeOutcome = {
    SKIP_RESPOND: 'skip_respond_invite',
    SUCCESS_RESPOND: 'success_respond_invite',
    ERROR: 'error'
};

var InviteActions = {
    ACCEPT: 'accept',
    DECLINE: 'decline',
    SEND: 'send'
};

var Actions = {
    USER_AUTHZ_AUTH_CODE: 'user_added_auth_code',
    AUTHZ_USER_REMOVED: 'user_removed',
    USER_ACCEPT_INVITE: 'user_accepted',
    USER_DECLINE_INVITE: 'user_declined',
    USER_INVITED: 'user_invited'
};

function fetchActionParameter() {
    var action = requestParameters.get('action');

    if (!action) {
        _log('No invite action found in request');
        return false;
    } else {
        if (!action.get(0).equals('accept') && !action.get(0).equals('decline')) {
            _log('Unsupported action found in request: ' + action.get(0));
            return 'error';
        }
    }

    _log('Invite action found in request: ' + action.get(0));
    return action.get(0);
}

function logResponse(response) {
    _log('Scripted Node HTTP Response: ' + response.getStatus() + ', Body: ' + response.getEntity().getString());
}

// responds to the invite
function respondToInvite(callerId, company, action) {
    _log('Processing action \'' + action + '\' for user ' + callerId + ' and company ' + JSON.parse(company).number);

    var request = new org.forgerock.http.protocol.Request();
    var ACCESS_TOKEN_STATE_FIELD = 'idmAccessToken';
    var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);
    var companyNo = JSON.parse(company).number;
    if (accessToken == null) {
        _log('Access token not in transient state');
        return NodeOutcome.ERROR;
    }

    var requestBodyJson =
    {
        'action': action,
        'callerId': callerId,
        'subjectId': callerId,
        'companyNumber': companyNo
    };

    request.setMethod('POST');

    request.setUri(idmCompanyAuthEndpoint + '?_action=respondToInvite');
    request.getHeaders().add('Authorization', 'Bearer ' + accessToken);
    request.getHeaders().add('Content-Type', 'application/json');
    request.getHeaders().add('Accept-API-Version', 'resource=1.0');
    request.setEntity(requestBodyJson);

    var response = httpClient.send(request).get();
    var actionResponse = JSON.parse(response.getEntity().getString());

    logResponse(response);

    if (response.getStatus().getCode() === 200) {
        _log('200 response from IDM');
        return {
            success: actionResponse.success,
            inviterId: actionResponse.company.inviterId
        };
    } else {
        _log('Error during action processing');
        return {
            success: false,
            message: actionResponse.detail.reason
        };
    }
}

// raises a generic registration error
function sendErrorCallbacks(stage, token, message) {
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
                JSON.stringify(
                    {
                        errors: [
                            { label: message, token: token }
                        ]
                    })
            )
        ).build();
    }
}

// main execution flow
try {
    var idmCompanyAuthEndpoint = 'https://openam-companieshouse-uk-dev.id.forgerock.io/openidm/endpoint/companyauth/';
    var actionParam = fetchActionParameter();
    var companyData = sharedState.get('companyData');
    // var invitedEmail = sharedState.get('email');
    var userId = sharedState.get('_id');

    // if there is no 'action' parameter or the 'action' parameter is set to 'send', skip the accept/reject logic, and proceed to sending the invite
    if (!actionParam || actionParam === InviteActions.SEND) {
        _log('Skip invite response processing');
        outcome = NodeOutcome.SKIP_RESPOND;
    } else if (actionParam === 'error') {
        sendErrorCallbacks('INVITE_USER_ERROR', 'INVITE_USER_UNKNOWN_ACTION_ERROR', 'Unsupported action found in request');
    } else {
        var companyNotificationData;

        if (actionParam === InviteActions.ACCEPT) {
            var acceptResponse = respondToInvite(userId, companyData, InviteActions.ACCEPT);
            _log('ACCEPT INVITE RESPONSE: ' + JSON.stringify(acceptResponse));
            if (!acceptResponse.success) {
                _log('Error while setting relationship status to confirmed');
                sendErrorCallbacks('INVITE_USER_ERROR', 'INVITE_USER_ACCEPT_INVITE_ERROR', acceptResponse.message);
            } else {
                companyNotificationData = {
                    companyNumber: String(JSON.parse(companyData).number),
                    subjectId: String(userId),
                    actorId: String(acceptResponse.inviterId),
                    action: String(Actions.USER_ACCEPT_INVITE)
                };
                sharedState.put('companyNotification', JSON.stringify(companyNotificationData));
                outcome = NodeOutcome.SUCCESS_RESPOND;
            }
        } else if (actionParam === InviteActions.DECLINE) {
            var declineResponse = respondToInvite(userId, companyData, InviteActions.DECLINE);

            if (!declineResponse.success) {
                _log('Error while removing relationship');
                sendErrorCallbacks('INVITE_USER_ERROR', 'INVITE_USER_DECLINE_INVITE_ERROR', declineResponse.message);
            } else {
                companyNotificationData = {
                    companyNumber: String(JSON.parse(companyData).number),
                    subjectId: String(userId),
                    actorId: String(declineResponse.inviterId),
                    action: String(Actions.USER_DECLINE_INVITE)
                };
                sharedState.put('companyNotification', JSON.stringify(companyNotificationData));
                outcome = NodeOutcome.SUCCESS_RESPOND;
            }
        }
        _log('Completed, Outcome = ' + outcome);
    }
} catch (e) {
    _log('Error : ' + e);
    sharedState.put('errorMessage', e.toString());
    outcome = NodeOutcome.ERROR;
}

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END