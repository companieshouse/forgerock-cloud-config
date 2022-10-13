var _scriptName = 'CH WEBFILING STORE LANG IN SESSION';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  java.lang.String
);

var NodeOutcome = {
  SUCCESS: 'success'
};

// main execution flow
try {
  var language = _getSelectedLanguage(requestHeaders);
  action = fr.Action.goTo(NodeOutcome.SUCCESS)
    .putSessionProperty('language', language.toLowerCase())
    .build();
} catch (e) {
  _log('error : ' + e);
  sharedState.put('errorMessage', e.toString());
}

// LIBRARY START
// LIBRARY END