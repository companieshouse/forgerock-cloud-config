var _scriptName = 'CH LOGIN ERROR MESSAGE';
_log('Starting');

_log('Cannot find a user with this email.');
sharedState.put('errorMessage', 'Cannot find a user with this email.');
sharedState.put('pagePropsJSON', JSON.stringify(
  {
    'errors': [{
      label: 'Cannot find a user with this email.',
      token: 'USER_EMAIL_NOT_FOUND',
      fieldName: 'IDToken2',
      anchor: 'IDToken2'
    }]
  }));

outcome = 'true';
 
_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END