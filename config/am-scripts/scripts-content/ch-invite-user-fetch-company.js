/* 
  ** INPUT DATA
    * QUERY PARAMETERS
      - 'companyNumber': the company number to invite users for
    
    * SHARED STATE:
      - '_id': session owner ID

    * TRANSIENT STATE
      - 'idmAccessToken': the IDM access token

  ** OUTPUT DATA
   
    * SHARED STATE:
      - 'companyData' : the company data which has been fetched
      - 'errorMessage': the error message to be displayed
      - 'pagePropsJSON': the JSON props for the UI

  ** OUTCOMES
    - success: input collected
    - error: an error occurred
  
  ** CALLBACKS: 
    - output: stage name and page props for UI
*/

var _scriptName = 'CH INVITE USER FETCH COMPANY';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
);

var NodeOutcome = {
  SUCCESS: 'success',
  RESEND_INVITE: 'resend',
  ERROR: 'error'
};

function fetchQueryParameters () {
  var companyNo = requestParameters.get('companyNumber');
  var userId = requestParameters.get('userId');

  if (!companyNo) {
    _log('No Company Number found in request.');
    var errorMessage = 'No Company Number found in request.';
    var errorProps = JSON.stringify(
      {
        'errors': [{
          label: 'No Company Number found in request.',
          token: 'INVITE_USER_NO_COMPANY_IN_REQUEST_ERROR'
        }]
      });

    if (callbacks.isEmpty()) {
      action = fr.Action.send(
        new fr.TextOutputCallback(fr.TextOutputCallback.ERROR, errorMessage),
        new fr.HiddenValueCallback('stage', 'INVITE_USER_ERROR'),
        new fr.HiddenValueCallback('pagePropsJSON', errorProps)
      ).build();
    }
  } else {
    return {
      companyNo: companyNo.get(0),
      userId: userId ? userId.get(0) : null
    };
  }
}

//checks whether the user with the given email already exists in IDM
function getUserInfo (userId) {
  try {
    var idmUserIdEndpoint = idmUserEndpoint + userId;
    var request = new org.forgerock.http.protocol.Request();
    var accessToken = transientState.get('idmAccessToken');
    if (!accessToken) {
      _log('Access token not in shared state');
      return {
        success: false,
        message: 'Access token not in shared state'
      };
    }

    request.setMethod('GET');
    request.setUri(idmUserIdEndpoint);
    request.getHeaders().add('Authorization', 'Bearer ' + accessToken);
    request.getHeaders().add('Content-Type', 'application/json');
    request.getHeaders().add('Accept-API-Version', 'resource=1.0');

    var response = httpClient.send(request).get();

    if (response.getStatus().getCode() === 200) {
      var user = JSON.parse(response.getEntity().getString());
      if (user) {
        _log('user found: ' + JSON.stringify(user));
        return {
          success: true,
          user: user
        };
      } else {
        _log('user NOT found: ' + userId);
        return {
          success: false,
          message: 'User not found: ' + userId
        };
      }
    } else {
      _log('Error while fetching user: ' + response.getStatus().getCode());
      return {
        success: false,
        message: 'Error while fetching user: ' + response.getStatus().getCode()
      };
    }
  } catch (e) {
    _log(e);
    return {
      success: false,
      message: 'Error during user lookup: ' + e
    };
  }
}

// gets company information
function getCompanyInfo (userId, companyNo) {

  var request = new org.forgerock.http.protocol.Request();
  var accessToken = transientState.get('idmAccessToken');
  if (accessToken == null) {
    _log('Access token not in shared state');
    return NodeOutcome.ERROR;
  }

  var requestBodyJson =
    {
      'callerId': userId,
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
  
    if (companyResponse.success) {
      return companyResponse.company;
    } else {
      _log('Error during company lookup');
      var errorProps = JSON.stringify(
        {
          'errors': [{
            label: companyResponse.message,
            token: 'INVITE_USER_COMPANY_LOOKUP_ERROR'
          }]
        });

      if (callbacks.isEmpty()) {
        action = fr.Action.send(
          new fr.TextOutputCallback(fr.TextOutputCallback.ERROR, companyResponse.message),
          new fr.HiddenValueCallback('stage', 'INVITE_USER_ERROR'),
          new fr.HiddenValueCallback('pagePropsJSON', errorProps)
        ).build();
      }
    }
  } else {
    _log('Could not get company ' + companyNo + ' - Error ' + response.getEntity().getString());
    return false;
  }
}

// main execution flow
try {
  var idmCompanyAuthEndpoint = _fromConfig('FIDC_ENDPOINT') + '/openidm/endpoint/companyauth/';
  var idmUserEndpoint = _fromConfig('FIDC_ENDPOINT') + '/openidm/managed/alpha_user/';
  var params = fetchQueryParameters();

  var sessionOwner = sharedState.get('_id');
  var companyData = getCompanyInfo(sessionOwner, params.companyNo);

  if (companyData) {
    sharedState.put('companyData', JSON.stringify(companyData));
    if (params.userId) {
      var userInfo = getUserInfo(params.userId);
      if (!userInfo.success) {
        sharedState.put('errorMessage', 'Error while fetching user by ID: ' + params.userId);
        _log('Error while fetching user by ID ' + params.userId);
        outcome = NodeOutcome.ERROR;
      } else {
        sharedState.put('email', userInfo.user.userName);
        outcome = NodeOutcome.RESEND_INVITE;
      }
    } else {
      outcome = NodeOutcome.SUCCESS;
    }
  } else {
    sharedState.put('errorMessage', 'Could not find a company with number ' + params.companyNo);
    outcome = NodeOutcome.ERROR;
  }
} catch (e) {
  sharedState.put('errorMessage', e.toString());
  _log('Error ' + e);
  outcome = NodeOutcome.ERROR;
}

_log('Outcome : ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END