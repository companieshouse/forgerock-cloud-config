var _scriptName = 'CH UPDATE EMAIL PATCH NEW EMAIL';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.PasswordCallback,
  javax.security.auth.callback.TextOutputCallback,
  javax.security.auth.callback.NameCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback,
  java.lang.String
);

var NodeOutcome = {
  SUCCESS: 'success',
  ERROR: 'error'
};

//updates the username (=email) of the given user 
function updateUsername (userId, value) {
  var alphaUserUrl = FIDC_ENDPOINT.concat('/openidm/managed/alpha_user/' + userId);
  var accessToken = sharedState.get('idmAccessToken');
  if (accessToken == null) {
    _log('Access token not in shared state');
    return false;
  }
  _log('Updating email to ' + value);

  var request = new org.forgerock.http.protocol.Request();
  request.setMethod('PATCH');
  request.setUri(alphaUserUrl);
  request.getHeaders().add('Authorization', 'Bearer ' + accessToken);
  request.getHeaders().add('Content-Type', 'application/json');
  var requestBodyJson = [
    {
      'operation': 'replace',
      'field': '/userName',
      'value': value
    }
  ];
  request.setEntity(requestBodyJson);

  var response = httpClient.send(request).get();

  if (response.getStatus().getCode() === 200) {
    _log('User email updated correctly');
    return true;
  } else {
    _log('Error while updating email value: ' + response.getStatus().getCode());
    return false;
  }
}

// main execution flow
try {
  var FIDC_ENDPOINT = 'https://openam-companieshouse-uk-dev.id.forgerock.io';
  //var alphaUserUrl  = "https://openam-companieshouse-uk-dev.id.forgerock.io/openidm/managed/alpha_user/";
  var newEmail = sharedState.get('newEmail');
  var sessionOwnerId = sharedState.get('_id');
  var result = updateUsername(sessionOwnerId, newEmail);
  if (!result) {
    sharedState.put('errorMessage', 'Could not update the user');
    sharedState.put('pagePropsJSON', JSON.stringify(
      {
        'errors': [{
          label: 'Could not update the user',
          token: 'CHANGE_EMAIL_ERROR',
          fieldName: 'IDToken2',
          anchor: 'IDToken2'
        }]
      }));
    outcome = NodeOutcome.ERROR;
  } else {
    sharedState.put('username', newEmail);
    outcome = NodeOutcome.SUCCESS;
  }
} catch (e) {
  _log('error ' + e);
  sharedState.put('errorMessage', e.toString());
  outcome = NodeOutcome.ERROR;
}

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END