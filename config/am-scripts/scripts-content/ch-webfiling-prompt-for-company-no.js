var _scriptName = 'CH WEBFILING PROMPT FOR COMPANY NO';
_log('Starting');

/* 
  ** INPUT DATA
    * QUERY PARAMS
     - companyNo: (optional) the comapny number to be looked up 

  ** OUTPUT DATA
    * SHARED STATE:
      - 'companyNumber' : the company number entered by the user
      - 'jurisdiction': the selected company jurisdiction
      - [optional] 'errorMessage': error message to display from previous attempts
      - 'skipConfirmation': the flag used to skip the company selection confirmation step
    * SESSION:
      - 'companyNumber': the selected company number
      - 'jurisdiction': the selected company jurisdiction

  ** OUTCOMES
    - true: input collected
  
  ** CALLBACKS: 
    - input: company number
    - jurisdiction: the company jurisdiction code (EW, SC, NI)
    - output: prompt to enter company no + jurisdiction, or error message (if any)
    - output: stage name and page props for UI
*/

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.NameCallback,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback,
  javax.security.auth.callback.ChoiceCallback
);

var jurisdictions = ['EW', 'SC', 'NI'];

var NodeOutcome = {
  TRUE: 'true',
  FALSE: 'false'
};

//extracts the company number (if present) from the query parameters
function fetchCompanyParameters () {
  var companyNo = requestParameters.get('companyNo');
  var jurisdiction = requestParameters.get('jurisdiction');
  if (companyNo && jurisdiction) {
    _log('company number/jurisdiction found in request: ' + companyNo.get(0) + ' - ' + jurisdiction.get(0));
    return {
      companyNo: companyNo.get(0),
      jurisdiction: jurisdiction.get(0)
    };
  }
  _log('Company number or jurisdiction not found in request');
  return false;
}

try {

  if (_isAuthenticated()) {
    // _log('Existing session: ' + existingSession.toString());
    _log('Has existing session');
  } else {
    _log('no session!');
  }

  var companyParamsResponse = fetchCompanyParameters();

  if (!companyParamsResponse) {
    if (callbacks.isEmpty()) {
      var infoMessage = 'Please enter the company number.';
      var errorMessage = sharedState.get('errorMessage');
      var level = fr.TextOutputCallback.INFORMATION;
      if (errorMessage !== null) {
        var errorProps = sharedState.get('pagePropsJSON');
        level = fr.TextOutputCallback.ERROR;
        infoMessage = errorMessage.concat(' Please try again.');
        action = fr.Action.send(
          new fr.TextOutputCallback(level, infoMessage),
          new fr.NameCallback('Enter Company number'),
          new fr.ChoiceCallback(
            'Where was the company registered?',
            jurisdictions,
            0,
            false
          ),
          new fr.HiddenValueCallback('stage', 'EWF_LOGIN_2'),
          new fr.HiddenValueCallback('pagePropsJSON', errorProps)
        ).build();
      } else {
        action = fr.Action.send(
          new fr.TextOutputCallback(level, infoMessage),
          new fr.NameCallback('Enter Company number'),
          new fr.ChoiceCallback(
            'Where was the company registered?',
            jurisdictions,
            0,
            false
          ),
          new fr.HiddenValueCallback('stage', 'EWF_LOGIN_2')
        ).build();
      }
    } else {
      var jurisdictionIndex = callbacks.get(2).getSelectedIndexes()[0];
      _log('jurisdiction: ' + jurisdictions[jurisdictionIndex]);

      var companyNumber = callbacks.get(1).getName();
      _log('companyNumber: ' + companyNumber);

      sharedState.put('companyNumber', companyNumber);
      sharedState.put('jurisdiction', jurisdictions[jurisdictionIndex]);
      action = fr.Action.goTo(NodeOutcome.TRUE)
        .putSessionProperty('companyNumber', companyNumber)
        .putSessionProperty('jurisdiction', jurisdictions[jurisdictionIndex])
        .build();
    }
  } else {
    _log('companyNumber (from query params): ' + companyParamsResponse.companyNo + ' - ' + companyParamsResponse.jurisdiction);
    sharedState.put('companyNumber', companyParamsResponse.companyNo);
    sharedState.put('jurisdiction', companyParamsResponse.jurisdiction);
    sharedState.put('skipConfirmation', true);
    action = fr.Action.goTo(NodeOutcome.TRUE)
      .putSessionProperty('companyNumber', companyParamsResponse.companyNo)
      .putSessionProperty('jurisdiction', companyParamsResponse.jurisdiction)
      .build();
  }
} catch (e) {
  _log('ERROR: ' + e);
  sharedState.put('errorMessage', e.toString());
  action = fr.Action.goTo(NodeOutcome.FALSE).build();
}

// LIBRARY START
// LIBRARY END