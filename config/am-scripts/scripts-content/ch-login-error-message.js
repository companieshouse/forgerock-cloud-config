var _scriptName = 'CH LOGIN ERROR MESSAGE';
_log('Starting');

var username = sharedState.get('username') || '<Unknown>';

_log('Cannot find a user with this email : ' + username);

sharedState.put('errorMessage', 'Cannot find a user with this email : ' + username);

sharedState.put('pagePropsJSON', JSON.stringify(
  {
    'errors': [{
      label: 'Cannot find a user with this email : ' + username,
      token: 'USER_EMAIL_NOT_FOUND',
      fieldName: 'IDToken2',
      anchor: 'IDToken2'
    }]
  }));

outcome = 'true';

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END