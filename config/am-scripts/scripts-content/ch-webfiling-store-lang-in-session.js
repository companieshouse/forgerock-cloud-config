var _scriptName = 'CH WEBFILING STORE LANG IN SESSION';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  java.lang.String
);

var NodeOutcome = {
  SUCCESS: 'success'
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

// main execution flow
try {
  var language = getSelectedLanguage(requestHeaders);
  action = fr.Action.goTo(NodeOutcome.SUCCESS)
    .putSessionProperty('language', language.toLowerCase())
    .build();
} catch (e) {
  _log('error : ' + e);
  sharedState.put('errorMessage', e.toString());
}

// LIBRARY START
// LIBRARY END