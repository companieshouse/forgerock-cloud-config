var _scriptName = 'CH JOIN COMPANY CREATE RELATIONSHIP';
_log('Starting');

/* 
  ** INPUT DATA
    * SHARED STATE:
      - 'companyData' : the result of the company lookup by ID
      - '_id' : the user ID we need to create the asscoiation for. This can be manually populated or be result of a previous execution of the 'Identify Exisitng User' node
    * TRANSIENT STATE
      - 'idmAccessToken' : the IDM Access Token, which can be obtained by executing a scripted decision node configured with the script 'CH - Get IDM Access Token'
  ** OUTPUT DATA:
    * SHARED STATE
      - 'errorMessage': set if an error is raised which needs to be displayed to the user
  ** OUTCOMES
    - true: association successful
    - error: error during association (IDM token not found, error during relationship creation)
    - already_associated: company is already associated with the user
  
  ** CALLBACKS: 
    - error: user is already associated with a company
*/

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback,
  org.forgerock.http.protocol.Entity
);

var NodeOutcome = {
  TRUE: 'true',
  ERROR: 'error',
  COMPANY_ALREADY_ASSOCIATED: 'already_associated',
  AUTH_CODE_INACTIVE: 'auth_code_inactive'
};

var Actions = {
  USER_AUTHZ_AUTH_CODE: 'user_added_auth_code',
  AUTHZ_USER_REMOVED: 'user_removed',
  USER_ACCEPT_INVITE: 'user_accepted',
  USER_INVITED: 'user_invited'
};

function logResponse (response) {
  _log('Scripted Node HTTP Response: ' + response.getStatus() + ', Body: ' + response.getEntity().getString());
}

// checks whether the user has already the company associated with their profile
function checkUserAlreadyAuthzForCompany (userId, company) {
  try{
    var request = new org.forgerock.http.protocol.Request();

    var accessToken = transientState.get('idmAccessToken');
    if (accessToken == null) {
      _log('[CHECK USER AUTHZ] Access token not in transient state');
      return {
        success: false,
        message: 'Access token not in transient state'
      };
    }

    var requestBodyJson =
      {
        'subjectId': userId,
        'companyNumber': company.number
      };

    request.setMethod('POST');

    request.setUri(idmCompanyAuthEndpoint + '?_action=getCompanyStatusByUserId');
    _log('[CHECK USER AUTHZ] Call URL: ' + idmCompanyAuthEndpoint + '?_action=getCompanyStatusByUserId');
    request.getHeaders().add('Authorization', 'Bearer ' + accessToken);
    request.getHeaders().add('Content-Type', 'application/json');
    request.getHeaders().add('Accept-API-Version', 'resource=1.0');
    request.setEntity(requestBodyJson);

    var response = httpClient.send(request).get();
    var actionResponse = JSON.parse(response.getEntity().getString());
    if (response.getStatus().getCode() === 200) {
      return (actionResponse.success && actionResponse.company.status === 'confirmed');
    } else {
      _log('[CHECK USER AUTHZ] Error during action processing');
      return false;
    }
  }catch(e){
    _log('[CHECK USER AUTHZ] Error during action processing');
    return false;
  }
}

//creates the relationship between the user and the given company
function addRelationshipToCompany (userId, company) {
  try{
    var request = new org.forgerock.http.protocol.Request();

    var accessToken = transientState.get('idmAccessToken');
    if (accessToken == null) {
      _log('[ADD RELATIONSHIP] Access token not in transient state');
      return {
        success: false,
        message: 'Access token not in transient state'
      };
    }

    var requestBodyJson =
      {
        'subjectId': userId,
        'companyNumber': company.number
      };

    request.setMethod('POST');

    request.setUri(idmCompanyAuthEndpoint + '?_action=addAuthorisedUser');
    request.getHeaders().add('Authorization', 'Bearer ' + accessToken);
    request.getHeaders().add('Content-Type', 'application/json');
    request.getHeaders().add('Accept-API-Version', 'resource=1.0');
    request.setEntity(requestBodyJson);
    _log('[ADD RELATIONSHIP] Calling IDM endpoint: ' + idmCompanyAuthEndpoint + '?_action=addAuthorisedUser');
    var response = httpClient.send(request).get();
    var actionResponse = JSON.parse(response.getEntity().getString());
    if (response.getStatus().getCode() === 200) {
      _log('[ADD RELATIONSHIP] Created relationship with company - user: ' + userId + ' - company: ' + company.number);
      return {
        success: actionResponse.success
      };
    } else {
      _log('[ADD RELATIONSHIP] Error during action processing - ' + actionResponse.detail.reason);
      return {
        success: false,
        message: actionResponse.detail.reason
      };
    }
  } catch (e){
    _log('[ADD RELATIONSHIP] Exception while adding relationship - ' + e);
    return {
      success: false,
      message: e.toString()
    };
  }
}

// builds an error callback given a stage name and a message text
function buildErrorCallback (stageName, message) {
  if (callbacks.isEmpty()) {
    action = fr.Action.send(
      new fr.HiddenValueCallback(
        'stage',
        stageName
      ),
      new fr.TextOutputCallback(
        fr.TextOutputCallback.ERROR,
        message
      ),
      new fr.HiddenValueCallback(
        'pagePropsJSON',
        JSON.stringify({ 'errors': [{ label: message }] })
      )
    ).build();
  }
}

//fetches the IDM access token from transient state
function fetchIDMToken () {
  var ACCESS_TOKEN_STATE_FIELD = 'idmAccessToken';
  var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);
  if (accessToken == null) {
    _log('Access token not in transient state');
    return false;
  }
  return accessToken;
}

function isCompanyAuthCodeActive (startDate, expiryDate) {
  var now = new Date();
  try {

    if (startDate && expiryDate) {
      const parsedStartA = _convertStringToDate(startDate.substring(0, 10));
      const parsedExpiryA = _convertStringToDate(expiryDate.substring(0, 10));
      return {
        success: true,
        isActive: (now >= parsedStartA) && (now < parsedExpiryA)
      };
    } else if (startDate && !expiryDate) {
      const parsedStartB = _convertStringToDate(startDate.substring(0, 10));
      return {
        success: true,
        isActive: (now >= parsedStartB)
      };
    } else {
      return { 
        success: true,
        isActive: false
      };
    }
  } catch (e) {
    _log('Error checking auth code active status : ' + e);
    return {
      success: false,
      error: true
    };
  }
}

// main execution flow
try {
  var idmCompanyAuthEndpoint = _fromConfig('FIDC_ENDPOINT') + '/openidm/endpoint/companyauth/';
  var idmUserEndpoint = _fromConfig('FIDC_ENDPOINT') + '/openidm/managed/alpha_user/';
  var companyData = sharedState.get('companyData');
  var userId = sharedState.get('_id');
  _log('Incoming company data :' + companyData);
  _log('Incoming company id :' + JSON.parse(companyData)._id);
  var language = _getSelectedLanguage(requestHeaders);

  var accessToken = fetchIDMToken();
  if (!accessToken) {
    action = fr.Action.goTo(NodeOutcome.NodeOutcome.ERROR).build();
  }

  var authCodeStartDate = JSON.parse(companyData).authCodeValidFrom;
  var authCodeExpiryDate = JSON.parse(companyData).authCodeValidUntil;
  var authCodeActiveResult = isCompanyAuthCodeActive(authCodeStartDate, authCodeExpiryDate);

  if (checkUserAlreadyAuthzForCompany(userId, JSON.parse(companyData))) {
    _log('The user is already authorised (CONFIRMED) for company ' + JSON.parse(companyData).name);
    sharedState.put('errorMessage', 'The company ' + JSON.parse(companyData).name + ' is already associated with the user.');
    sharedState.put('pagePropsJSON', JSON.stringify(
      {
        'errors': [{
          label: 'The company ' + JSON.parse(companyData).name + ' is already associated with this user',
          token: 'COMPANY_ALREADY_ASSOCIATED',
          fieldName: 'IDToken2',
          anchor: 'IDToken2'
        }],
        'company': {
          name: JSON.parse(companyData).name
        }
      }));
    action = fr.Action.goTo(NodeOutcome.COMPANY_ALREADY_ASSOCIATED)
      .putSessionProperty('language', language.toLowerCase())
      .build();
  } else if (authCodeActiveResult.success && !authCodeActiveResult.isActive) {
    _log('The company ' + JSON.parse(companyData).name + ' does not have an active auth code');
    sharedState.put('errorMessage', 'The company ' + JSON.parse(companyData).name + ' does not have an active auth code. ');
    sharedState.put('pagePropsJSON', JSON.stringify(
      {
        'errors': [{
          label: 'The company ' + JSON.parse(companyData).name + 'does not have an active auth code.',
          token: 'AUTH_CODE_INACTIVE',
          fieldName: 'IDToken1',
          anchor: 'IDToken1'
        }],
        'company': {
          name: JSON.parse(companyData).name
        }
      }));
    action = fr.Action.goTo(NodeOutcome.AUTH_CODE_INACTIVE).build();
  } else if (authCodeActiveResult.error) {
    _log('Could not verify expiration date of auth code for company ' + JSON.parse(companyData).name);
    sharedState.put('errorMessage', 'Could not verify expiration date of auth code for company ' + JSON.parse(companyData).name);
    sharedState.put('pagePropsJSON', JSON.stringify(
      {
        'errors': [{
          label: 'Could not verify expiration date of auth code for company ' + JSON.parse(companyData).name,
          token: 'AUTH_CODE_UNVERIFIABLE',
          fieldName: 'IDToken1',
          anchor: 'IDToken1'
        }],
        'company': {
          name: JSON.parse(companyData).name
        }
      }));
    action = fr.Action.goTo(NodeOutcome.AUTH_CODE_INACTIVE).build();
  } else {
    _log('Adding relationship between user ' + userId + ' and company ' + JSON.parse(companyData).number);
    var addUserResult = addRelationshipToCompany(userId, JSON.parse(companyData));

    var companyNotificationData = {
      companyNumber: String(JSON.parse(companyData).number),
      subjectId: String(userId),
      actorId: String(userId),
      action: String(Actions.USER_AUTHZ_AUTH_CODE)
    };

    sharedState.put('companyNotification', JSON.stringify(companyNotificationData));

    action = fr.Action.goTo(addUserResult.success ? NodeOutcome.TRUE : NodeOutcome.ERROR)
      .putSessionProperty('language', language.toLowerCase())
      .build();
  }
} catch (e) {
  _log('[TOPLEVEL] ERROR: ' + e);
  sharedState.put('errorMessage', e.toString());
  action = fr.Action.goTo(NodeOutcome.ERROR).build();
}

// LIBRARY START
// LIBRARY END