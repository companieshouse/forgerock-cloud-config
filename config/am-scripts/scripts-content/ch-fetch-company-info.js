var _scriptName = 'CH FETCH COMPANY INFO';
_log('Starting');

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
  DORMANT: 'dormant',
  DISSOLVED: 'dissolved'
};

function logResponse (response) {
  _log('Scripted Node HTTP Response: ' + response.getStatus() + ', Body: ' + response.getEntity().getString());
}

function fetchIDMToken () {
  var ACCESS_TOKEN_STATE_FIELD = 'idmAccessToken';
  var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);
  if (accessToken == null) {
    _log('Access token not in transient state');
    return false;
  }
  return accessToken;
}

function getCompanyByNumber (accessToken, companyNumber) {

  var request = new org.forgerock.http.protocol.Request();

  request.setMethod('GET');

  var searchTerm = '?_queryFilter=number+eq+%22' + companyNumber + '%22';
  request.setUri(idmCompanyEndpoint + searchTerm);
  request.getHeaders().add('Authorization', 'Bearer ' + accessToken);
  request.getHeaders().add('Content-Type', 'application/json');

  var response = httpClient.send(request).get();

  if (response.getStatus().getCode() === 200) {
    var companyResponse = JSON.parse(response.getEntity().getString());

    if (companyResponse.resultCount > 0) {
      var companyData = companyResponse.result[0];

      _log('Got a result: ' + JSON.stringify(companyData));
      return {
        success: true,
        companyData: companyData
      };
    } else {
      return {
        success: false,
        reason: 'NO_RESULTS'
      };
    }
  } else {
    return {
      success: false,
      reason: 'ERROR'
    };
  }
}

function createPatchItem (fieldName, value) {
  if (!value) {
    return {
      'operation': 'remove',
      'field': '/' + fieldName
    };
  } else return {
    'operation': 'replace',
    'field': '/' + fieldName,
    'value': value
  };
}

function createOrUpdateCompany (accessToken, companyNumber, idmCompanyResult) {
  try {

    //gets company data from CHS
    var chsCompanyData = fetchCompanyFromCHS(accessToken, companyNumber);
    //gets auth code data from EWF
    var ewfAuthCodeData = fetchAuthCodeFromEWF(accessToken, companyNumber);

    _log('chsCompanyData : ' + chsCompanyData);
    _log('ewfAuthCodeData : ' + ewfAuthCodeData);
    _log('idmCompanyResult : ' + idmCompanyResult);

    // if the connectors were queried OK but no company data was found at source, AND no data is in IDM for that company, skip the update
    if ((chsCompanyData.success && chsCompanyData.isEmpty) && 
        (ewfAuthCodeData.success && ewfAuthCodeData.isEmpty) && 
        !idmCompanyResult.success) {
      return {
        success: false,
        message: 'Company with number ' + companyNumber + ' not found in CHS, EWF or FIDC'
      };
    }

    //if the record is not found in neither CHS nor EWF, but is in FIDC, we skip the update/create logic and return the FIDC version
    if ((chsCompanyData.success && chsCompanyData.isEmpty) && 
        (ewfAuthCodeData.success && ewfAuthCodeData.isEmpty) &&
        idmCompanyResult.success) {
      return {
        success: true,
        companyData: idmCompanyResult.companyData,
        message: 'Company with number ' + companyNumber + ' not found in CHS or EWF - returning current IDM version'
      };
    }

    var request = new org.forgerock.http.protocol.Request();
    var requestBodyJson;

    if (!idmCompanyResult.success) {
      request.setMethod('POST');
      request.setUri(idmCompanyEndpoint + '?_action=create');
      requestBodyJson = {
        number: chsCompanyData.success ? chsCompanyData.data.number : ewfAuthCodeData.data.number,
        type: chsCompanyData.success ? chsCompanyData.data.type : null,
        status: chsCompanyData.success ? chsCompanyData.data.status : null,
        locality: chsCompanyData.success ? chsCompanyData.data.locality : null,
        postalCode: chsCompanyData.success ? chsCompanyData.data.postalCode : null,
        addressLine1: chsCompanyData.success ? chsCompanyData.data.addressLine1 : null,
        addressLine2: chsCompanyData.success ? chsCompanyData.data.addressLine2 : null,
        region: chsCompanyData.success ? chsCompanyData.data.region : null,
        creationDate: chsCompanyData.success ? chsCompanyData.data.creationDate : null,
        jurisdiction: chsCompanyData.success ? chsCompanyData.data.jurisdiction : null,
        name: chsCompanyData.success ? chsCompanyData.data.name : null,
        authCode: ewfAuthCodeData.success ? ewfAuthCodeData.data.authCode : null,
        authCodeValidFrom: ewfAuthCodeData.success ? ewfAuthCodeData.data.authCodeValidFrom : null,
        authCodeValidUntil: ewfAuthCodeData.success ? ewfAuthCodeData.data.authCodeValidUntil : null
      };
    } else {
      var companyId = idmCompanyResult.companyData._id;
      request.setMethod('PATCH');
      request.setUri(idmCompanyEndpoint + companyId);
      requestBodyJson = [
        createPatchItem('type', chsCompanyData.success ? chsCompanyData.data.type : null),
        createPatchItem('status', chsCompanyData.success ? chsCompanyData.data.status : null),
        createPatchItem('locality', chsCompanyData.success ? chsCompanyData.data.locality : null),
        createPatchItem('postalCode', chsCompanyData.success ? chsCompanyData.data.postalCode : null),
        createPatchItem('addressLine1', chsCompanyData.success ? chsCompanyData.data.addressLine1 : null),
        createPatchItem('addressLine2', chsCompanyData.success ? chsCompanyData.data.addressLine2 : null),
        createPatchItem('region', chsCompanyData.success ? chsCompanyData.data.region : null),
        createPatchItem('creationDate', chsCompanyData.success ? chsCompanyData.data.creationDate : null),
        createPatchItem('jurisdiction', chsCompanyData.success ? chsCompanyData.data.jurisdiction : null),
        createPatchItem('name', chsCompanyData.success ? chsCompanyData.data.name : null),
        createPatchItem('authCode', ewfAuthCodeData.success ? ewfAuthCodeData.data.authCode : null),
        createPatchItem('authCodeValidFrom', ewfAuthCodeData.success ? ewfAuthCodeData.data.authCodeValidFrom : null),
        createPatchItem('authCodeValidUntil', ewfAuthCodeData.success ? ewfAuthCodeData.data.authCodeValidUntil : null)
      ];
    }

    request.getHeaders().add('Authorization', 'Bearer ' + accessToken);
    request.getHeaders().add('Content-Type', 'application/json');
    request.getHeaders().add('Accept-API-Version', 'resource=1.0');
    request.setEntity(requestBodyJson);

    var response = httpClient.send(request).get();

    if (response.getStatus().getCode() === 201 || response.getStatus().getCode() === 200) {
      
      if (response.getStatus().getCode() === 200){
        _log('Company Updated from CHS: ' + companyNumber);
      }
      if (response.getStatus().getCode() === 201){
        _log('Company Created from CHS: ' + companyNumber);
      }

      return {
        success: true,
        companyData: JSON.parse(response.getEntity().getString())
      };
    } else {
      _log('Error during company creation/update');
      return {
        success: false,
        message: JSON.parse(response.getEntity().getString())
      };
    }
  } catch (e) {
    _log(e);
    return {
      success: false,
      message: 'Exception : ' + e
    };
  }
}

function getCompanyByNumberAndJurisdiction (accessToken, companyNumber, jurisdiction, skipConfirmation) {
  if (companyNumber == null) {
    _log('No company number in shared state');
    sharedState.put('errorMessage', 'No company number in shared state.');
    return {
      success: false,
      message: 'No company number in shared state.'
    };
  }

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

  //gets company data currently in IDM
  _log('Getting company by number : ' + companyNumber);
  var idmCompanyResult = getCompanyByNumber(accessToken, companyNumber);
  _log('Result from getCompanyByNumber : ' + idmCompanyResult);

  //company gets created/updated from source in IDM
  createOrUpdateCompany(accessToken, companyNumber, idmCompanyResult);

  var request = new org.forgerock.http.protocol.Request();
  request.setMethod('GET');
  request.setUri(idmCompanyEndpoint + searchTerm);
  request.getHeaders().add('Authorization', 'Bearer ' + accessToken);
  request.getHeaders().add('Content-Type', 'application/json');

  var response = httpClient.send(request).get();

  logResponse(response);

  if (response.getStatus().getCode() === 200) {
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

      if (companyStatus.equals(CompanyStatus.DISSOLVED)) {
        _log('The company is dissolved');
        sharedState.put('errorMessage', 'The company ' + companyName + ' is dissolved.');
        sharedState.put('pagePropsJSON', JSON.stringify(
          {
            'errors': [{
              label: 'The company ' + companyName + ' is dissolved.',
              token: 'COMPANY_NOT_ACTIVE',
              fieldName: isEWF ? 'IDToken3' : 'IDToken2',
              anchor: isEWF ? 'IDToken3' : 'IDToken2'
            }],
            'company': { name: companyName }
          }));
        return {
          success: false,
          message: 'The company ' + companyName + ' is dissolved.'
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
      sharedState.put('errorMessage', 'The company ' + companyNumber + ' could not be found.');
      sharedState.put('pagePropsJSON', JSON.stringify(
        {
          'errors': [{
            label: 'The company ' + companyNumber + ' could not be found.',
            token: 'COMPANY_NOT_FOUND',
            fieldName: 'IDToken2',
            anchor: 'IDToken2'
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
          fieldName: 'IDToken2',
          anchor: 'IDToken2'
        }],
        'company': { number: companyNumber }
      }));
    return {
      success: false,
      message: 'Error while retrieving company ' + companyNumber + '.'
    };
  }
}

function fetchCompanyFromCHS (accessToken, companyNumber) {

  try {
    if (!companyNumber || companyNumber.trim() === '') {
      _log('No company number from CHS!');
      return {
        success: false,
        message: 'no company number present'
      };
    }

    companyNumber = companyNumber.trim();

    var searchTerm = '?_queryFilter=_id+eq+%22' + companyNumber + '%22';
    var request = new org.forgerock.http.protocol.Request();
    request.setMethod('GET');
    request.setUri(SYSTEM_CHS_COMPANY + searchTerm);
    request.getHeaders().add('Authorization', 'Bearer ' + accessToken);
    request.getHeaders().add('Content-Type', 'application/json');
    request.getHeaders().add('Accept-API-Version', 'resource=1.0');

    var httpResp = httpClient.send(request).get();

    if (!httpResp.getStatus().getCode() === 200) {
      _log('Error while fetching CHS Company: ' + response.getEntity().getString());
      return {
        success: false,
        message: 'Error in querying the Mongo connector'
      };
    }

    var response = JSON.parse(httpResp.getEntity().getString());
    _log('CHS Company query for : ' + companyNumber + ', Count = ' + response.resultCount);

    if (response.resultCount === 1) {
      _log('Response from CHS Company connector : ' + httpResp.getEntity().getString());

      if (response.result[0]._id) {

        var data = {
          name: response.result[0].data.company_name,
          number: response.result[0].data.company_number,
          type: response.result[0].data.type,
          status: response.result[0].data.company_status,
          locality: response.result[0].data.registered_office_address ? response.result[0].data.registered_office_address.locality : null,
          postalCode: response.result[0].data.registered_office_address ? response.result[0].data.registered_office_address.postal_code : null,
          addressLine1: response.result[0].data.registered_office_address ? response.result[0].data.registered_office_address.address_line_1 : null,
          addressLine2: response.result[0].data.registered_office_address ? response.result[0].data.registered_office_address.address_line_2 : null,
          region: response.result[0].data.registered_office_address ? response.result[0].data.registered_office_address.region : null,
          creationDate: response.result[0].data.date_of_creation,
          jurisdiction: _getJurisdictionCode(response.result[0].data)
        };
        return {
          success: true,
          isEmpty: false,
          data: data
        };
      } else {
        return {
          success: false,
          message: 'result found without _id in payload'
        };
      }
    } else {
      return {
        success: true,
        isEmpty: true
      };
    }
  } catch (e) {
    _log('Error : ' + e);
    return {
      success: false,
      message: 'error: ' + e.toString()
    };
  }
}

function fetchAuthCodeFromEWF (accessToken, companyNumber) {
  try {
    if (!companyNumber || companyNumber.trim() === '') {
      _log('No company number from EWF!');
      return {
        success: false,
        message: 'no company number present'
      };
    }

    companyNumber = companyNumber.trim();

    var searchTerm = '?_queryFilter=_id+eq+%22' + companyNumber + '%22';
    var request = new org.forgerock.http.protocol.Request();
    request.setMethod('GET');
    request.setUri(SYSTEM_WEBFILING_AUTH_CODE + searchTerm);
    request.getHeaders().add('Authorization', 'Bearer ' + accessToken);
    request.getHeaders().add('Content-Type', 'application/json');

    var httpResp = httpClient.send(request).get();

    if (!httpResp.getStatus().getCode() === 200) {
      _log('Error while fetching EWF Auth Code: ' + response.getEntity().getString());
      return {
        success: false,
        message: 'Error in querying the Oracle connector'
      };
    } 

    var response = JSON.parse(httpResp.getEntity().getString());
    _log('EWF company auth code for : ' + companyNumber + ', Count = ' + response.resultCount);

    if (response.resultCount === 1) {
      _log('Response from EWF connector: ' + JSON.stringify(response.result[0]));

      if (response.result[0]._id) {

        _log('EWF company auth code query for : ' + companyNumber + ', Value put in Cache = ' + response.result[0]._id);
        var data = {
          authCode: response.result[0].AUTHCODE,
          authCodeValidFrom: response.result[0].STARTDTE,
          authCodeValidUntil: response.result[0].EXPIRYDTE,
          number: response.result[0]._id
        };
        return {
          success: true,
          isEmpty: false,
          data: data
        };
      } else {
        return {
          success: false,
          message: 'result found without _id in payload'
        };
      }
    } else {
      return {
        success: true,
        isEmpty: true
      };
    }
  } catch (e) {
    _log('Error : ' + e);
    return {
      success: false,
      message: 'error: ' + e.toString()
    };
  }
}

// main execution flow

var YES_OPTION_INDEX = 0;
var idmCompanyEndpoint = _fromConfig('FIDC_ENDPOINT') + '/openidm/managed/alpha_organization/';
var SYSTEM_CHS_COMPANY = _fromConfig('FIDC_ENDPOINT') + '/openidm/system/CHSCompany/company_profile';
var SYSTEM_WEBFILING_AUTH_CODE = _fromConfig('FIDC_ENDPOINT') + '/openidm/system/WebfilingAuthCode/authCode';
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
        var jurisdiction = sharedState.get('jurisdiction');

        //fetchCompany can only result in callbacks, does not transition anywhere
        var idmCompanyData = getCompanyByNumberAndJurisdiction(accessToken, companyNumber, jurisdiction, skipConfirmation);

        if (!idmCompanyData || !idmCompanyData.success) {
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
      var jurisdiction = sharedState.get('jurisdiction');

      var idmCompanyResult = getCompanyByNumber(accessToken, companyNumber);
      createOrUpdateCompany(accessToken, companyNumber, idmCompanyResult);

      //fetchCompany can only result in callbacks, does not transition anywhere
      var idmCompanyData = getCompanyByNumberAndJurisdiction(accessToken, companyNumber, jurisdiction, skipConfirmation);
      if (!idmCompanyData || !idmCompanyData.success) {
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