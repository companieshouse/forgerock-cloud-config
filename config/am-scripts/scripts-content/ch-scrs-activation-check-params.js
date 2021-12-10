var _scriptName = 'CH SCRS ACTIVATION CHECKS';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  java.lang.Math,
  java.lang.String,
  org.forgerock.openam.auth.node.api,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
);

var NodeOutcome = {
  USER_ALREADY_ACTIVE: 'already_active',
  USER_NOT_ACTIVE: 'not_active',
  ERROR: 'error'
};

var MembershipStatus = {
  CONFIRMED: 'confirmed',
  PENDING: 'pending',
  NONE: 'none'
};

var FIDC_ENDPOINT = _fromConfig('FIDC_ENDPOINT');

function extractActivationParameters () {
  var userIdParam = requestParameters.get('_id');
  var companyNoParam = requestParameters.get('companyNo');
  var activationIdParam = requestParameters.get('tokenId');

  if (!userIdParam || !companyNoParam || !activationIdParam) {
    if (callbacks.isEmpty()) {
      action = fr.Action.send(
        new fr.HiddenValueCallback(
          'stage',
          'SCRS_ERROR'
        ),
        new fr.HiddenValueCallback(
          'pagePropsJSON',
          JSON.stringify({
            'errors': [{
              label: 'No Activation params (_id, companyNo, tokenId) found in request.',
              token: 'SCRS_ERROR_MISSING_PARAMS'
            }]
          })),
        new fr.TextOutputCallback(
          fr.TextOutputCallback.ERROR,
          'No Activation params (_id, companyNo, tokenId) found in request.')
      ).build();
      return false;
    }
  } else {
    return {
      userId: userIdParam.get(0),
      companyNo: companyNoParam.get(0),
      activationId: activationIdParam.get(0)
    };
  }
}

// extracts the user membership status to the given company. User could be provided as a user ID or a username (email) 
function isUserAuthorisedForCompany (userId, companyNo, accessToken) {
  var request = new org.forgerock.http.protocol.Request();
  var accessToken = transientState.get('idmAccessToken');
  var idmCompanyAuthEndpoint = FIDC_ENDPOINT + '/openidm/endpoint/companyauth?_action=getCompanyStatusByUserId';
  if (accessToken === null) {
    _log('Access token not in transient state');
    return {
      success: false,
      error: 'Access token not in transient state'
    };
  }

  var requestBodyJson = {
    'subjectId': userId,
    'companyNumber': companyNo
  };

  request.setMethod('POST');
  _log('Check user ' + userId + ' membership status to company ' + companyNo);
  request.setUri(idmCompanyAuthEndpoint);
  request.getHeaders().add('Authorization', 'Bearer ' + accessToken);
  request.getHeaders().add('Content-Type', 'application/json');
  request.getHeaders().add('Accept-API-Version', 'resource=1.0');
  request.setEntity(requestBodyJson);

  var response = httpClient.send(request).get();
  _log(response.getStatus().getCode() + ' response from IDM');
  var membershipResponse = JSON.parse(response.getEntity().getString());
  if (response.getStatus().getCode() === 200) {
    if (membershipResponse.company.status === MembershipStatus.CONFIRMED) {
      return {
        success: true,
        companyName: membershipResponse.company.name,
        isConfirmed: (membershipResponse.company.status === MembershipStatus.CONFIRMED)
      };
    } else {
      return {
        success: false,
        error: 'The user ' + userId + ' is not currently associated with company ' + companyNo,
        code: 'SCRS_ERROR_USER_NOT_ASSOCIATED'
      };
    }
  } else if (response.getStatus().getCode() === 404) {
    return {
      success: false,
      code: membershipResponse.message.indexOf('User could not be found') > -1 ? 'SCRS_ERROR_USER_NOT_FOUND' : 'SCRS_ERROR_COMPANY_NOT_FOUND',
      error: membershipResponse.message
    };
  } else {
    return {
      success: false,
      code: 'SCRS_ERROR_LOOKUP_FAILED',
      error: 'Error during relationship check - ' + membershipResponse.message
    };
  }
}

function raiseError (message, token) {
  if (callbacks.isEmpty()) {
    action = fr.Action.send(
      new fr.HiddenValueCallback(
        'stage',
        'SCRS_ERROR'
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

function saveUserDataToState (email, userId) {
  try {
    sharedState.put('objectAttributes',
      {
        'userName': email,
        'sn': email,
        'mail': email
      });
    sharedState.put('userName', email);
    sharedState.put('userId', userId);
    return true;
  } catch (e) {
    _log('error while storing state: ' + e);
    return false;
  }
}

//main execution flow
try {
  if (typeof existingSession !== 'undefined') {
    if (callbacks.isEmpty()) {
      action = fr.Action.send(
        new fr.HiddenValueCallback(
          'stage',
          'SCRS_ERROR'
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
    var params = extractActivationParameters();
    sharedState.put('isSCRSActivation', true);
    if (params) {
      var accessToken = _fetchIDMToken();
      var isUserAuthorisedResponse = isUserAuthorisedForCompany(params.userId, params.companyNo, accessToken);
      if (!isUserAuthorisedResponse.success) {
        raiseError(isUserAuthorisedResponse.error, isUserAuthorisedResponse.code);
      } else {
        var userResponse = _getUserInfoById(params.userId, accessToken);
        if (userResponse.user.accountStatus === 'active') {
          outcome = NodeOutcome.USER_ALREADY_ACTIVE;
        } else {
          if (String(params.activationId) === String(userResponse.user.frUnindexedString3)) {
            saveUserDataToState(userResponse.user.userName, params.userId);
            outcome = NodeOutcome.USER_NOT_ACTIVE;
          } else {
            raiseError('The activation ID in the email does not match the one in the user profile', 'SCRS_ERROR_ACTIVATION_ID_MISMATCH');
          }
        }
      }
    }
  }
} catch (e) {
  _log('error ' + e);
  sharedState.put('errorMessage', e.toString());
  outcome = NodeOutcome.ERROR;
}

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END