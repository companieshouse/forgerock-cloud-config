var _scriptName = 'CH JOIN COMPANY PROMPT FOR COMPANY NO';
_log('Starting', 'MESSAGE');

/* 
  ** OUTPUT DATA
    * SHARED STATE:
      - 'companyNumber' : the company number entered by the user
      - [optional] 'errorMessage': error message to display from previous attempts
       
  ** OUTCOMES
    - true: input collected
  
  ** CALLBACKS: 
    - input: company number
    - output: prompt to enter company no, or error message (if any)
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
      new fr.HiddenValueCallback('stage', 'COMPANY_ASSOCIATION_1'),
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
      new fr.HiddenValueCallback('stage', 'COMPANY_ASSOCIATION_1')
    ).build();
  }
} else {
  var jurisdictionIndex = callbacks.get(2).getSelectedIndexes()[0];
  _log('jurisdiction: ' + jurisdictions[jurisdictionIndex], 'MESSAGE');

  var companyNumber = callbacks.get(1).getName();
  _log('companyNumber: ' + companyNumber, 'MESSAGE');
  sharedState.put('jurisdiction', jurisdictions[jurisdictionIndex]);
  sharedState.put('companyNumber', companyNumber);
  action = fr.Action.goTo('true').build();
}

// LIBRARY START
// LIBRARY END