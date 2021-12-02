var _scriptName = 'CH UPDATE PWD PASSWORD ERROR MESSAGE';
_log('Starting');

sharedState.put('errorMessage', 'The current password you supplied is incorrect.');
sharedState.put('pagePropsJSON', JSON.stringify(
  {
    'errors': [{
      label: 'The current password you supplied is incorrect.',
      token: 'PWD_INCORRECT',
      fieldName: 'IDToken2',
      anchor: 'IDToken2'
    }]
  }));
_log('The current password you supplied is incorrect');
outcome = 'true';

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END