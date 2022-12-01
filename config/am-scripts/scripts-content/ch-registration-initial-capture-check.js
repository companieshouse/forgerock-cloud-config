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

  _log('For fullName : ' + sharedState.get('objectAttributes').get('givenName'), 'MESSAGE');
  _log('Checking mail : ' + sharedState.get('objectAttributes').get('mail'), 'MESSAGE');
  _log('Checking telephoneNumber : ' + sharedState.get('objectAttributes').get('telephoneNumber'), 'MESSAGE');

  var emailAddress = sharedState.get('objectAttributes').get('mail');

  if (!emailAddress) {

    invalidEmail = true;

    errors.push({
      label: 'No email address entered',
      token: 'REGISTRATION_REQUIRED(mail)',
      fieldName: 'IDToken3',
      anchor: 'IDToken3'
    });

    outcome = NodeOutcome.ERROR;

  } else if (emailAddress && !_isValidEmail(emailAddress)) {

    invalidEmail = true;

    errors.push({
      label: 'Invalid email address entered',
      token: 'REGISTRATION_VALID_EMAIL_ADDRESS_FORMAT(mail)',
      fieldName: 'IDToken3',
      anchor: 'IDToken3'
    });

    outcome = NodeOutcome.ERROR;
  }
  
  sharedState.put('username', emailAddress);
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