var _scriptName = 'CH LOGIN INPUT CHECK';
_log('Starting');

var username = sharedState.get('username');
var password = transientState.get('password');

_log('Checking input for username : ' + username);
// _log('Shared State : ' + sharedState.toString());

var NodeOutcome = {
  TRUE: 'true',
  FALSE: 'false'
};

try {
  var errorMessage = '';
  //both credentials are supplied
  if (username && password) {
    // email has wrong format
    if (!_isValidEmail(username)) {
      errorMessage = errorMessage.concat('Invalid email format: ').concat(username);
      _log(errorMessage);
      sharedState.put('errorMessage', errorMessage);
      sharedState.put('pagePropsJSON', JSON.stringify(
        {
          'errors': [{
            label: errorMessage,
            token: 'EMAIL_FORMAT_ERROR',
            fieldName: 'IDToken1',
            anchor: 'IDToken1'
          }]
        }));
      outcome = NodeOutcome.FALSE;
    } else {
      _log('User ' + username + ' logging in...');
      outcome = NodeOutcome.TRUE;
    }
  } else if (!username || !password) {

    _log('username or pwd missing');

    var errors = [];

    if (!username) {
      errors.push({
        label: 'Username missing',
        token: 'CREDENTIALS_MISSING_USERNAME',
        fieldName: 'IDToken1',
        anchor: 'IDToken1'
      });
    }

    if (!password) {
      errors.push({
        label: 'Password missing',
        token: 'CREDENTIALS_MISSING_PASSWORD',
        fieldName: 'IDToken2',
        anchor: 'IDToken2'
      });
    }

    sharedState.put('errorMessage', 'Username or password missing.');
    sharedState.put('pagePropsJSON', JSON.stringify(
      {
        'errors': errors
      }));

    outcome = NodeOutcome.FALSE;
  } else {
    outcome = NodeOutcome.TRUE;
  }

} catch (e) {
  _log('error: ' + e);
  sharedState.put('errorMessage', e.toString());
}

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END