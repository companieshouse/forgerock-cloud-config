var _scriptName = 'CH PHONE NUMBER PRESENT';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action
);

var PHONE_NUMBER_FIELD = 'telephoneNumber';

var userId = sharedState.get('_id');
if (idRepository.getAttribute(userId, PHONE_NUMBER_FIELD).iterator().hasNext()) {
  var phoneNumber = idRepository.getAttribute(userId, PHONE_NUMBER_FIELD).iterator().next();
  _log('Found telephoneNumber: ' + phoneNumber);
  outcome = 'true';
} else {
  _log('Couldn\'t find telephoneNumber');
  outcome = 'false';
}

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END