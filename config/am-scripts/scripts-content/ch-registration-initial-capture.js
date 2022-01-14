var _scriptName = 'CH REGISTRATION INITIAL CAPTURE';
_log('Starting');

var NodeOutcome = {
  TRUE: 'true'
};

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  javax.security.auth.callback.PasswordCallback,
  javax.security.auth.callback.NameCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback,
  com.sun.identity.authentication.callbacks.ScriptTextOutputCallback,
  javax.security.auth.callback.ConfirmationCallback,
  java.lang.String
);

var errorMessage = sharedState.get('errorMessage');
var errorProps = sharedState.get('pagePropsJSON');

if (callbacks.isEmpty()) {
  action = fr.Action.send(
    new fr.TextOutputCallback(fr.TextOutputCallback.INFORMATION, 'Sign Up'),
    new fr.NameCallback('Full Name (optional)'),
    new fr.NameCallback('Email Address'),
    new fr.NameCallback('Mobile Number (optional)'),
    new fr.HiddenValueCallback('stage', 'REGISTRATION_1'),
    new fr.HiddenValueCallback('header', 'Sign Up'),
    new fr.HiddenValueCallback('description', 'Signing up is fast and easy.<br>Already have an account? <a href="#/service/Login">Sign In</a>'),
    new fr.HiddenValueCallback('pagePropsJSON', errorProps)
  ).build();
} else {
  var fullName = callbacks.get(1).getName();
  var emailAddress = callbacks.get(2).getName();
  var mobileNumber = callbacks.get(3).getName();

  _log('fullName : ' + fullName);
  _log('emailAddress : ' + emailAddress);
  _log('mobileNumber : ' + mobileNumber);

  sharedState.put('objectAttributes',
    {
      'userName': emailAddress,
      'givenName': fullName,
      'telephoneNumber': mobileNumber,
      'mail': emailAddress
    });

  sharedState.put('errorMessage', null);
  sharedState.put('pagePropsJSON', null);

  outcome = NodeOutcome.TRUE;
}

_log('Outcome : ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END