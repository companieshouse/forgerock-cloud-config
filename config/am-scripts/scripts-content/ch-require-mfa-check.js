var _scriptName = 'CH REQUIRE MFA CHECK';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action
);

var userId = sharedState.get('_id');

// Use AM representation of attribute
var LAST_LOGIN_FIELD = 'fr-attr-idate1';

var checkMFA = false;

try {
  if (idRepository.getAttribute(userId, LAST_LOGIN_FIELD).iterator().hasNext()) {
    var lastLogin = String(idRepository.getAttribute(userId, LAST_LOGIN_FIELD).iterator().next());

    _log('lastLogin: ' + lastLogin); // e.g. 20210317114005Z

    if (lastLogin.length > 0) {
      var lastLoginDateUTC = _convertStringToDateTime(lastLogin);
      var now = new Date();

      var intervalDays = 30;
      var intervalInMillis = intervalDays * 86400 * 1000;

      var delta = now.getTime() - lastLoginDateUTC; // Difference in ms
      if (delta > intervalInMillis) {
        _log('User requires MFA check');
        checkMFA = true;
      } else {
        _log('User doesn\'t require MFA check');
      }
    }
  }

  if (checkMFA) {
    outcome = 'true';
  } else {
    outcome = 'false';
  }
} catch (e) {
  _log('Require MFA Check error: ' + e);
  sharedState.put('errorMessage', e.toString());
  outcome = 'false';
}

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END