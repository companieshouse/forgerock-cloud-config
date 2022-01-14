var _scriptName = 'CH REGISTRATION INITIAL CAPTURE CHECK';
_log('Starting');

var NodeOutcome = {
  TRUE: 'true',
  ERROR: 'error'
};

var errors = [];
var invalidEmail = false;
var invalidPhone = false;

outcome = NodeOutcome.TRUE;

if (sharedState.get('objectAttributes')) {

  _log('For fullName : ' + sharedState.get('objectAttributes').get('givenName'));
  _log('Checking mail : ' + sharedState.get('objectAttributes').get('mail'));
  _log('Checking telephoneNumber : ' + sharedState.get('objectAttributes').get('telephoneNumber'));

  var emailAddress = sharedState.get('objectAttributes').get('mail');

  if (!emailAddress || (emailAddress && !_isValidEmail(emailAddress))) {

    invalidEmail = true;

    errors.push({
      label: 'Invalid email address entered',
      token: 'UPDATE_EMAIL_INVALID_EMAIL_ADDRESS',
      fieldName: 'IDToken3',
      anchor: 'IDToken3'
    });

    outcome = NodeOutcome.ERROR;
  }

  var phoneNumber = sharedState.get('objectAttributes').get('telephoneNumber');

  if (phoneNumber) {
    if (!_isValidPhone(phoneNumber)) {

      invalidPhone = true;

      errors.push({
        label: 'Invalid mobile number entered',
        token: 'UPDATE_PHONE_INVALID_MOBILE_NUMBER',
        fieldName: 'IDToken4',
        anchor: 'IDToken4'
      });

      outcome = NodeOutcome.ERROR;
    }
  }

} else {
  _log('No registration data found, erroring!');
  outcome = NodeOutcome.ERROR;
}

if (outcome === NodeOutcome.ERROR) {

  sharedState.put('errorMessage', 'An error occurred');

  if (invalidEmail && invalidPhone) {
    sharedState.put('errorMessage', 'Invalid email address and mobile number entered.');
  } else if (invalidEmail) {
    sharedState.put('errorMessage', 'Invalid email address entered.');
  } else if (invalidPhone) {
    sharedState.put('errorMessage', 'Invalid mobile number entered.');
  }

  sharedState.put('pagePropsJSON', JSON.stringify(
    {
      'errors': errors
    }));
}

_log('Outcome : ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END