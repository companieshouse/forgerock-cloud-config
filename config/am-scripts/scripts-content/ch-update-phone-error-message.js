var _scriptName = 'CH UPDATE PHONE ERROR MESSAGE';
_log('Starting');

_log('Enter correct password.');

sharedState.put('errorMessage', 'Enter the correct password.');
sharedState.put('pagePropsJSON', JSON.stringify(
  {
    'errors': [{
      label: 'Enter the correct password.',
      token: 'USER_PASSWORD_INCORRECT',
      fieldName: 'IDToken3',
      anchor: 'IDToken3'
    }]
  }));

outcome = 'true';

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END