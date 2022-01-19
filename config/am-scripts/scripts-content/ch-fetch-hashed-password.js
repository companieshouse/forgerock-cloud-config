var _scriptName = 'CH FETCH HASHED PASSWORD';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action
);

var LEGACY_PASSWORD_FIELD = 'fr-attr-istr2';
var ORIGIN_FIELD = 'fr-attr-istr5';

var WEBFILING_USER = 'webfiling';

var NodeOutcome = {
  TRUE: 'true',
  FALSE: 'false'
};

function fetchHashedPassword () {
  var userId = sharedState.get('_id');
  _log('Found userId: ' + userId);

  if (idRepository.getAttribute(userId, LEGACY_PASSWORD_FIELD).iterator().hasNext()) {
    var legacyPassword = idRepository.getAttribute(userId, LEGACY_PASSWORD_FIELD).iterator().next();
    _log('Found legacyPassword: ' + legacyPassword);
    sharedState.put('hashedCredential', legacyPassword);

    var validateMethod = 'CHS';
    if (idRepository.getAttribute(userId, ORIGIN_FIELD).iterator().hasNext()) {
      var origin = idRepository.getAttribute(userId, ORIGIN_FIELD).iterator().next();
      _log('Origin: ' + origin);
      if (String(origin) === WEBFILING_USER) {
        validateMethod = WEBFILING_USER;
      }
    }
    _log('validateMethod: ' + validateMethod);
    sharedState.put('validateMethod', validateMethod);

    var password = transientState.get('password');
    sharedState.put('credential', password);
    transientState.put('newPassword', password);

    return NodeOutcome.TRUE;
  } else {
    _log('Couldn\'t find legacyPassword');
    return NodeOutcome.FALSE;
  }
}

outcome = fetchHashedPassword();

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END