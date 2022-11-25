var _scriptName = 'CH INVITE USER INVALID EMAIL ERROR MESSAGE';
_log('Starting', 'MESSAGE');

sharedState.put('errorMessage', 'Invalid email address.');
sharedState.put('pagePropsJSON', JSON.stringify(
  {
    'errors': [{
      label: 'Invalid email address.',
      token: 'INVITE_USER_INVALID_EMAIL_ERROR',
      fieldName: 'IDToken2',
      anchor: 'IDToken2'
    }]
  }));

outcome = 'true';

_log('Outcome = ' + _getOutcomeForDisplay());
 
// LIBRARY START
// LIBRARY END