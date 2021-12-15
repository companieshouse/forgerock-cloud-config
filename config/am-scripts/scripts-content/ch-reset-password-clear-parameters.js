var _scriptName = 'CH RESET PASSWORD CLEAR PARAMETERS';
_log('Starting');

var resetParams = {
  'frIndexedString3': null,
  'frIndexedString4': null,
  'frUnindexedInteger1': null,
  'accountStatus': 'active'
};

sharedState.put('objectAttributes', resetParams);

outcome = 'true';

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END