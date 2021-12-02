var _scriptName = 'CH PHONE NUMBER ENTERED';
_log('Starting');

var phone = sharedState.get('objectAttributes').get('telephoneNumber');
if (phone) {
  sharedState.put('registrationMFA', true);
  sharedState.put('mfa-route', 'sms');
  outcome = 'true';
} else {
  sharedState.put('mfa-route', 'email');
  outcome = 'false';
}

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END