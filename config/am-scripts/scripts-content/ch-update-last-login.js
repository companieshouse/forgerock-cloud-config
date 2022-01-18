var _scriptName = 'CH UPDATE LAST LOGIN';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action
);

var userId = sharedState.get('_id');

try {
  // Get current time in RFC-4517 format
  var lastLogin = _getCurrentDateAsString();

  _log('Setting last login to ' + lastLogin + ' for user ' + userId);

  // Use AM representation of attribute
  idRepository.setAttribute(userId, 'fr-attr-idate1', [lastLogin]);
} catch (e) {
  _log('Update Last Login error: ' + e);
}

outcome = 'true';

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END