var _scriptName = 'CH WEBFILING PROMPT FOR LINK CONFIRMATION';
_log('Starting');

/* 
  ** INPUT DATA:
    * SHARED STATE:
      - 'companyData' : the company info
      - [optional] 'pagePropsJSON': additional info to display
       
  ** OUTCOMES
    - true: input collected
    - false: handled error occurred
    - false: unhandled error occurred
  
  ** CALLBACKS: 
    - input: user confirmation choice (YES or NO)
    - output: company info
    - output: prompt to enter company no, or error message (if any)
    - output: stage name and page props for UI
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
  ERROR: 'error'
};

//extracts the language form headers (default to EN)
function getSelectedLanguage (requestHeaders) {
  if (requestHeaders && requestHeaders.get('Chosen-Language')) {
    var lang = requestHeaders.get('Chosen-Language').get(0);
    _log('selected language: ' + lang);
    return lang;
  }
  _log('no selected language found - defaulting to EN');
  return 'EN';
}

var YES_OPTION_INDEX = 0;

try {
  var companyData = sharedState.get('companyData');
  var language = getSelectedLanguage(requestHeaders);
  if (callbacks.isEmpty()) {
    var infoMessage = 'Do you want to add this company to your Companies House account?';
    var errorMessage = sharedState.get('errorMessage');
    var level = fr.TextOutputCallback.INFORMATION;
    if (errorMessage !== null) {
      var errorProps = sharedState.get('pagePropsJSON');
      level = fr.TextOutputCallback.ERROR;
      infoMessage = errorMessage.concat(' Please try again.');
      action = fr.Action.send(
        new fr.TextOutputCallback(level, infoMessage),
        new fr.ConfirmationCallback(
          'Do you want to add this company to your Companies House account?',
          fr.ConfirmationCallback.INFORMATION,
          ['YES', 'NO'],
          YES_OPTION_INDEX
        ),
        new fr.HiddenValueCallback('stage', 'EWF_LOGIN_5'),
        new fr.HiddenValueCallback('pagePropsJSON', errorProps)
      ).build();
    } else {
      action = fr.Action.send(
        new fr.TextOutputCallback(level, infoMessage),
        new fr.ConfirmationCallback(
          'Do you want to add this company to your Companies House account?',
          fr.ConfirmationCallback.INFORMATION,
          ['YES', 'NO'],
          YES_OPTION_INDEX
        ),
        new fr.HiddenValueCallback('stage', 'EWF_LOGIN_5'),
        new fr.HiddenValueCallback(
          'pagePropsJSON',
          JSON.stringify({
            'company': {
              name: JSON.parse(companyData).name
            }
          })
        )
      ).build();
    }
  } else {
    var selection = callbacks.get(1).getSelectedIndex();
    _log('selection ' + selection);
    if (selection === YES_OPTION_INDEX) {
      _log('selected YES');
      sharedState.put('errorMessage', null);
      sharedState.put('pagePropsJSON', null);
      action = fr.Action.goTo(NodeOutcome.TRUE).build();
    } else {
      sharedState.put('errorMessage', null);
      action = fr.Action.goTo(NodeOutcome.FALSE)
        .putSessionProperty('language', language.toLowerCase())
        .build();
    }
  }

} catch (e) {
  _log('ERROR: ' + e);
  sharedState.put('errorMessage', e.toString());
  outcome = NodeOutcome.error;
}

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END