var _scriptName = 'CH FETCH COMPANY INFO';
_log('Starting');

/* 
  ** INPUT DATA
    * SHARED STATE:
    - 'companyNumber' : the company number we need to lookup 
    - 'implicitConfirmSelection': 
    
    * TRANSIENT STATE
    - 'idmAccessToken' : the IDM Access Token, which can be obtained by executing a scripted decision node configured with the script 'CH - Get IDM Access Token'

  ** OUTPUT DATA
    * SHARED STATE:
    - 'companyData': the company data, result of the lookup
    - 'hashedCredential': the company auth code
    - 'validateMethod': the hashing type ('CHS' for auth codes)
    - [optional] 'errorMessage': error message to display from previous attempts

  ** OUTCOMES
    - true: user confirms to go ahdead with association
    - false: user goes back to company selection, or no company number found in context, auth code not set for company, company cannot be found in IDM, generic error
    - error: IDM token not found
  
  ** CALLBACKS:
    - Output INFO: Display of company information
    - Input: User confirmation if they want to file for this company (YES proceeds to association, NO goes back to company no. prompt)
    - Output ERROR: Error - company number not found
*/

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback,
  javax.security.auth.callback.ConfirmationCallback
);

var NodeOutcome = {
  TRUE: 'true',
  FALSE: 'false',
  ERROR: 'error',
  OTHER_COMPANY: 'other'
};

var jurisdictions = {
  EW: 'EW',
  SC: 'SC',
  NI: 'NI'
};

var CompanyStatus = {
  ACTIVE: 'active',
  DORMANT: 'dormant'
};

function logResponse (response) {
  _log('Scripted Node HTTP Response: ' + response.getStatus() + ', Body: ' + response.getEntity().getString());
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

// fetch the Company object given a company number
function fetchCompany (idmToken, companyNumber, skipConfirmation) {
  if (companyNumber == null) {
    _log('No company number in shared state');
    sharedState.put('errorMessage', 'No company number in shared state.');
    return {
      success: false,
      message: 'No company number in shared state.'
    };
  }

  var jurisdiction = sharedState.get('jurisdiction');
  var request = new org.forgerock.http.protocol.Request();

  request.setMethod('GET');

  var searchTerm;

  // if the user selected Scotland and provided a company number without 'SC' at the beginning, search for a match with either '<company no>' or 'SC<company no>'
  if (jurisdiction.equals(jurisdictions.SC) && companyNumber.indexOf('SC') !== 0) {
    _log('looking for SC company without \'SC\' prefix - adding it');
    searchTerm = '?_queryFilter=(number+eq+%22' + companyNumber + '%22+or+number+eq+%22SC' + companyNumber + '%22)+and+jurisdiction+eq+%22' + jurisdiction + '%22';
  } else {
    //for other jurisdictions, do not make any logic on prefixes
    searchTerm = '?_queryFilter=number+eq+%22' + companyNumber + '%22+and+jurisdiction+eq+%22' + jurisdiction + '%22';
  }

  _log('Using search term: ' + searchTerm);

  request.setUri(idmCompanyEndpoint + searchTerm);
  request.getHeaders().add('Authorization', 'Bearer ' + idmToken);
  request.getHeaders().add('Content-Type', 'application/json');

  var response = httpClient.send(request).get();

  logResponse(response);

  if (response.getStatus().getCode() === 200) {
    _log('200 response from IDM');
    var companyResponse = JSON.parse(response.getEntity().getString());

    if (companyResponse.resultCount > 0) {
      var companyData = companyResponse.result[0];
      var companyStatus = companyData.status;
      var authCode = companyData.authCode;
      var companyName = companyData.name;
      _log('Got a result: ' + JSON.stringify(companyData));

      if (authCode == null) {
        _log('No auth code associated with company');
        sharedState.put('errorMessage', 'No auth code associated with company ' + companyName + '.');
        sharedState.put('pagePropsJSON', JSON.stringify(
          {
            'errors': [{
              label: 'No auth code associated with company ' + companyName,
              token: 'AUTH_CODE_NOT_DEFINED',
              fieldName: isEWF ? 'IDToken3' : 'IDToken2',
              anchor: isEWF ? 'IDToken3' : 'IDToken2'
            }],
            'company': { name: companyName }
          }));
        return {
          success: false,
          message: 'No auth code associated with company ' + companyName + '.'
        };
      }

      _log('Found status: ' + companyStatus);

      if (!companyStatus.equals(CompanyStatus.ACTIVE) && !companyStatus.equals(CompanyStatus.DORMANT)) {
        _log('The company is not active/dormant');
        sharedState.put('errorMessage', 'The company ' + companyName + ' is not active or dormant.');
        sharedState.put('pagePropsJSON', JSON.stringify(
          {
            'errors': [{
              label: 'The company ' + companyName + ' is not active or dormant.',
              token: 'COMPANY_NOT_ACTIVE',
              fieldName: isEWF ? 'IDToken3' : 'IDToken2',
              anchor: isEWF ? 'IDToken3' : 'IDToken2'
            }],
            'company': { name: companyName }
          }));
        return {
          success: false,
          message: 'The company ' + companyName + ' is not active or dormant.'
        };
      }

      sharedState.put('companyData', JSON.stringify(companyData));
      sharedState.put('validateMethod', 'CHS');

      if (!skipConfirmation) {
        if (callbacks.isEmpty()) {
          action = fr.Action.send(
            new fr.HiddenValueCallback(
              'stage',
              isEWF ? 'EWF_LOGIN_3' : 'COMPANY_ASSOCIATION_2'
            ),
            new fr.TextOutputCallback(
              fr.TextOutputCallback.INFORMATION,
              JSON.stringify(
                {
                  'company': {
                    name: companyData.name,
                    number: companyData.number,
                    status: companyData.status
                  }
                }
              )
            ),
            new fr.HiddenValueCallback(
              'pagePropsJSON',
              JSON.stringify(
                {
                  'company': {
                    name: companyData.name,
                    number: companyData.number,
                    status: companyData.status,
                    creationDate: companyData.creationDate,
                    type: companyData.type,
                    addressLine1: companyData.addressLine1,
                    addressLine2: companyData.addressLine2,
                    region: companyData.region,
                    postalCode: companyData.postalCode
                  }
                }
              )
            ),
            new fr.ConfirmationCallback(
              'Do you want to file for this company?',
              fr.ConfirmationCallback.INFORMATION,
              ['YES', 'NO'],
              YES_OPTION_INDEX
            )
          ).build();
          return {
            success: true
          };
        }
      } else {
        return {
          success: true
        };
      }
    } else {
      _log('No company results for company number ' + companyNumber);
      sharedState.put('errorMessage', 'The company ' + companyNumber + ' could not be found. ' + searchTerm);
      sharedState.put('pagePropsJSON', JSON.stringify(
        {
          'errors': [{
            label: 'The company ${companyNumber} could not be found.',
            token: 'COMPANY_NOT_FOUND',
            fieldName: isEWF ? 'IDToken3' : 'IDToken2',
            anchor: isEWF ? 'IDToken3' : 'IDToken2'
          }],
          'company': { number: companyNumber }
        }));
      return {
        success: false,
        message: 'The company ' + companyNumber + ' could not be found.',
        searchTerm: searchTerm
      };
    }
  } else {
    _log('Error while retrieving company with ID ' + companyNumber);
    sharedState.put('errorMessage', 'Error while retrieving company ' + companyNumber + '.');
    sharedState.put('pagePropsJSON', JSON.stringify(
      {
        'errors': [{
          label: 'Error while retrieving company ' + companyNumber + '.',
          token: 'COMPANY_FETCH_ERROR',
          fieldName: isEWF ? 'IDToken3' : 'IDToken2',
          anchor: isEWF ? 'IDToken3' : 'IDToken2'
        }],
        'company': { number: companyNumber }
      }));
    return {
      success: false,
      message: 'Error while retrieving company ' + companyNumber + '.'
    };
  }
}

// main execution flow
var YES_OPTION_INDEX = 0;
var NO_OPTION_INDEX = 1;
var idmCompanyEndpoint = _fromConfig('FIDC_ENDPOINT') + '/openidm/managed/alpha_organization/';

var skipConfirmation = sharedState.get('skipConfirmation');
var isEWF = sharedState.get('EWF-JOURNEY');

try {
  // if the selection must be confirmed automatically
  if (!skipConfirmation) {
    // if the user has selected to proceed with association or to not go ahead, callbacks will be not empty
    if (!callbacks.isEmpty()) {
      var fileForThiscompanySelection = callbacks.get(3).getSelectedIndex();
      _log('\'File for this company selection\' ' + fileForThiscompanySelection);
      if (fileForThiscompanySelection === YES_OPTION_INDEX) {
        _log('File for this company: selected YES');
        sharedState.put('errorMessage', null);
        sharedState.put('pagePropsJSON', null);
        outcome = NodeOutcome.TRUE;
      } else {
        _log('File for this company: selected NO');
        sharedState.put('errorMessage', null);
        sharedState.put('pagePropsJSON', null);
        outcome = NodeOutcome.OTHER_COMPANY;
      }
    } else {
      // if the user has started the journey, the callbacks will be empty, then fetch company info
      var accessToken = fetchIDMToken();
      if (!accessToken) {
        _log('Access token not in transient state');
        outcome = NodeOutcome.ERROR;
      } else {
        var companyNumber = sharedState.get('companyNumber');
        //fetchCompany can only result in callbacks, does not transition anywhere
        var fetchResult = fetchCompany(accessToken, companyNumber, skipConfirmation);
        if (!fetchResult.success) {
          outcome = NodeOutcome.FALSE;
        }
      }
    }
  } else {
    _log('SKIP USER CONFIRMATION');
    var accessToken = fetchIDMToken();
    if (!accessToken) {
      _log('Access token not in transient state');
      outcome = NodeOutcome.ERROR;
    } else {
      var companyNumber = sharedState.get('companyNumber');
      //fetchCompany can only result in callbacks, does not transition anywhere
      var fetchResult = fetchCompany(accessToken, companyNumber, skipConfirmation);
      if (!fetchResult.success) {
        outcome = NodeOutcome.FALSE;
      } else {
        _log('Company fetched successfully');
        outcome = NodeOutcome.TRUE;
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