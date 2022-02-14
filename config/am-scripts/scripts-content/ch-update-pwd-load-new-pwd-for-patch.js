var _scriptName = 'CH UPDATE PWD LOAD NEW PWD FOR PATCH';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
);

var password = transientState.get('newPassword');

// logic for pwd set at registration
try {
  var objectAttributes = sharedState.get('objectAttributes');
  objectAttributes.put('password', password);

  sharedState.put('objectAttributes', objectAttributes);
  sharedState.put('password', password);
  
  _log('updated sharedstate: ' + sharedState.get('objectAttributes'));

  _log('new password: ' + password);
  if (!password) {
    sharedState.put('errorMessage', 'The new password could not be found in transient state.');
    outcome = 'error';
  } else {
    transientState.put('objectAttributes', { 'password': password, 'frIndexedDate2': null });
    outcome = 'true';
  }

} catch (e) {
  sharedState.put('errorMessage', 'Error preparing pwd: ' + e);
  outcome = 'error';
}

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END