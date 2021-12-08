var _scriptName = 'CH SCRS UNLOCK USER';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  java.lang.Math,
  java.lang.String,
  org.forgerock.openam.auth.node.api,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
);

var NodeOutcome = {
  USER_UNLOCKED: 'user_unlocked',
  ERROR: 'error'
};

var FIDC_ENDPOINT = 'https://openam-companieshouse-uk-dev.id.forgerock.io';

function raiseError (message, token) {
  if (callbacks.isEmpty()) {
    action = fr.Action.send(
      new fr.HiddenValueCallback(
        'stage',
        'SCRS_ERROR'
      ),
      new fr.HiddenValueCallback(
        'pagePropsJSON',
        JSON.stringify(
          {
            'errors': [{
              label: message,
              token: token,
            }]
          }
        )
      ),
      new fr.TextOutputCallback(
        fr.TextOutputCallback.ERROR,
        message
      )
    ).build();
  }
}

// soft locks the user, by setting the soft lock date (in UNIX date format) into frIndexedString4
function performUserUnlock (userId, accessToken) {
  var alphaUserUrl = 'https://openam-companieshouse-uk-dev.id.forgerock.io/openidm/managed/alpha_user/';  
  var request = new org.forgerock.http.protocol.Request();
  request.setMethod('PATCH');
  request.setUri(alphaUserUrl + userId);
  request.getHeaders().add('Authorization', 'Bearer ' + accessToken);
  request.getHeaders().add('Content-Type', 'application/json');
  var requestBodyJson = [
    {
      'operation': 'remove',
      'field': '/frUnindexedString3'
    },
    {
      'operation': 'replace',
      'field': '/accountStatus',
      'value': 'active'
    }
  ];
  request.setEntity(requestBodyJson);
  //_log("[UPDATE SOFT LOCK COUNTER] request JSON: " + JSON.stringify(requestBodyJson));

  var response = httpClient.send(request).get();

  if (response.getStatus().getCode() === 200) {
    _log('Soft lock date set correctly');
    return true;
  } else {
    _log('Error while setting soft lock date: ' + response.getStatus().getCode());
    return false;
  }
}

//main execution flow
try {
  var accessToken = _fetchIDMToken();
  var userId = sharedState.get('userId');
  var unlockStatus = performUserUnlock (userId, accessToken);
  if(unlockStatus) {
    _log('User unlocked!');
    outcome = NodeOutcome.USER_UNLOCKED;
  } else {
    _log('User unlock failed!');
    outcome = NodeOutcome.ERROR;
  }
} catch (e) {
  _log('error ' + e);
  sharedState.put('errorMessage', e.toString());
  outcome = NodeOutcome.ERROR;
}

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END