var _scriptName = 'CH UPDATE NAME INPUT COLLECTOR';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.PasswordCallback,
  javax.security.auth.callback.NameCallback,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback,
  java.lang.String
);

var NodeOutcome = {
  SUCCESS: 'success',
  FAIL: 'fail'
};

if (callbacks.isEmpty()) {
  var infoMessage = 'Please enter your full name.';
  var errorMessage = sharedState.get('errorMessage');
  var level = fr.TextOutputCallback.INFORMATION;
  if (errorMessage !== null) {
    var errorProps = sharedState.get('pagePropsJSON');
    level = fr.TextOutputCallback.ERROR;
    infoMessage = errorMessage.concat(' Please try again.');
    action = fr.Action.send(
      new fr.TextOutputCallback(level, infoMessage),
      new fr.NameCallback('Enter Full Name'),
      new fr.HiddenValueCallback('stage', 'CHANGE_NAME_1'),
      new fr.HiddenValueCallback('pagePropsJSON', errorProps)
    ).build();
  } else {
    action = fr.Action.send(
      new fr.TextOutputCallback(level, infoMessage),
      new fr.NameCallback('Enter Full Name'),
      new fr.HiddenValueCallback('stage', 'CHANGE_NAME_1')
    ).build();
  }
} else {
  var fullName = callbacks.get(1).getName();
  _log('full name: ' + fullName);

  sharedState.put('objectAttributes',
    {
      'givenName': fullName
    });

  action = fr.Action.goTo(NodeOutcome.SUCCESS).build();
}

// LIBRARY START
// LIBRARY END