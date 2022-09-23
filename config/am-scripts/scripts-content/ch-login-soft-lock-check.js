var _scriptName = 'CH LOGIN SOFT LOCK CHECK';
_log('Starting');

/* 
  ** INPUT DATA
    * SHARED STATE:
      - '_id"': the user ID which has been looked up in a previous step

    * TRANSIENT STATE
      - 'idmAccessToken': the IDM access token

  ** OUTPUT DATA
    * SHARED STATE:
      - 'errorMessage': the 'account locked' message, or the 'generic error' message
      - 'pagePropsJSON': the JSON props for the UI to consume via callbacks
    
  ** OUTCOMES
    - locked: the user is currently soft locked
    - lock_expired: the user is soft locked but the lock has expired
    - not_locked: the user is currently not soft locked
    - error: error while checking user soft lock status
*/

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback,
  java.lang.Integer
);

var ACCESS_TOKEN_STATE_FIELD = 'idmAccessToken';
var alphaUserUrl = _fromConfig('FIDC_ENDPOINT') + '/openidm/managed/alpha_user/';

var NodeOutcome = {
  LOCKED: 'locked',
  LOCK_EXPIRED: 'lock_expired',
  NOT_LOCKED: 'not_locked',
  ERROR: 'error'
};

function logResponse (response) {
  _log('Scripted Node HTTP Response: ' + response.getStatus() + ', Body: ' + response.getEntity().getString());
}

// checks the user soft lock status, by checking the frIndexedString4 (lock date) is populated and whether the date of lock is less than 5 mins ago
// return 'not_locked' if the date field is not set
// return 'lock_expired' if the time difference from the current time is MORE than SOFT_LOCK_MINUTES 
// return 'locked' if the date field is set and the time difference from the current time is LESS than SOFT_LOCK_MINUTES 
// return 'error' if there is an error in checking the soft lock status
function checkUserLockStatus (userId, accessToken) {

  try {
    var request = new org.forgerock.http.protocol.Request();

    request.setMethod('GET');
    request.setUri(alphaUserUrl + userId);
    request.getHeaders().add('Authorization', 'Bearer ' + accessToken);
    request.getHeaders().add('Content-Type', 'application/json');
    var response = httpClient.send(request).get();
    if (response.getStatus().getCode() === 200) {
      var userResponse = JSON.parse(response.getEntity().getString());
      var softLockDate = userResponse.frIndexedString4;
      if (!softLockDate) {
        _log('[CHECK LOCK STATUS] The user is not locked');
        return NodeOutcome.NOT_LOCKED;
      } else {
        _log('[CHECK LOCK STATUS] found lock date: ' + softLockDate);
        var now = new Date();
        var differenceInTime = now.getTime() - (new Date(softLockDate)).getTime();
        if (Math.round(differenceInTime / (1000 * 60)) < SOFT_LOCK_MINUTES) {
          _log('[CHECK LOCK STATUS] lock still valid: time diff in min: ' + Math.round(differenceInTime / (1000 * 60)));
          return NodeOutcome.LOCKED;
        } else {
          _log('[CHECK LOCK STATUS] lock expired: time diff in min: ' + Math.round(differenceInTime / (1000 * 60)));
          return NodeOutcome.LOCK_EXPIRED;
        }
      }
    } else {
      _log('[CHECK LOCK STATUS] Error while getting soft lock date: ' + response.getStatus().getCode());
      return NodeOutcome.ERROR;
    }
  } catch(e){
    _log('[CHECK LOCK STATUS] Error while chcking user lock status: ' + e);
      return NodeOutcome.ERROR;
  }
}

// main execution flow
try {
  var SOFT_LOCK_MINUTES = 5;
  var userId = sharedState.get('_id');

  if (userId == null) {
    _log('[TOPLEVEL] No user name in shared state');
    action = fr.Action.goTo(NodeOutcome.ERROR).build();
  }

  var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);
  if (accessToken == null) {
    _log('[TOPLEVEL] Access token not in shared state');
    action = fr.Action.goTo(NodeOutcome.ERROR).build();
  }

  var lockStatus = checkUserLockStatus(userId, accessToken);

  _log('[TOPLEVEL] Is user locked: ' + lockStatus);
  if (lockStatus === NodeOutcome.LOCKED) {
    sharedState.put('errorMessage', 'You have entered incorrect details too many times. Your account is now locked for '.concat(String(SOFT_LOCK_MINUTES), ' minutes.'));
    sharedState.put('pagePropsJSON', JSON.stringify(
      {
        'errors': [{
          label: 'You have entered incorrect details too many times. Your account is now locked for '.concat(String(SOFT_LOCK_MINUTES), ' minutes.'),
          token: 'ACCOUNT_LOCKED_ERROR',
          fieldName: 'IDToken1',
          anchor: 'IDToken1'
        }],
        'softLockMinutes': SOFT_LOCK_MINUTES
      }));
  } else if (lockStatus === NodeOutcome.ERROR) {
    sharedState.put('errorMessage', 'An error occurred. Try again later.');
    sharedState.put('pagePropsJSON', JSON.stringify(
      {
        'errors': [{
          label: 'An error occurred. Try again later.',
          token: 'LOGIN_GENERAL_ERROR',
          fieldName: 'IDToken1',
          anchor: 'IDToken1'
        }]
      }));
  }

  if (lockStatus === NodeOutcome.NOT_LOCKED) {
    //need to temporarily transfer the pwd to shared state, for the subtree to pick it up (and clean it up afterwards)
    sharedState.put('password', transientState.get('password'));
  }
  action = fr.Action.goTo(lockStatus).build();
} catch (e) {
  sharedState.put('errorMessage', e.toString());
  _log('[TOPLEVEL] Error - ' + e);
  action = fr.Action.goTo(NodeOutcome.ERROR).build();
}

// LIBRARY START
// LIBRARY END