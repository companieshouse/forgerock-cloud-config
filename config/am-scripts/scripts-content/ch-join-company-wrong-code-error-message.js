var _scriptName = 'CH JOIN COMPANY WRONG CODE ERROR MESSAGE';
_log('Starting', 'MESSAGE');

var companyData = sharedState.get('companyData');
sharedState.put('errorMessage', 'The auth code you supplied is incorrect.');
sharedState.put('pagePropsJSON', JSON.stringify(
  {
    'errors': [{
      label: 'The company authentication code you supplied is incorrect.',
      token: 'AUTH_CODE_INCORRECT',
      fieldName: 'IDToken2',
      anchor: 'IDToken2'
    }],
    'company': {
      name: JSON.parse(companyData).name
    }
  }));
_log('The auth code you supplied is incorrect.', 'MESSAGE');
outcome = 'true';

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END