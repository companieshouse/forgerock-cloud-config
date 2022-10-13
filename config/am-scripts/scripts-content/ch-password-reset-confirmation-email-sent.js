var _scriptName = 'CH PASSWORD RESET CONFIRMATION EMAIL SENT';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback,
  javax.security.auth.callback.ConfirmationCallback
);

var NodeOutcome = {
  CHANGE_EMAIL: 'change_email',
  RESEND: 'resend',
  TRUE: 'true'
};

var ConfirmIndex = {
  RESEND: 0,
  CHANGE_EMAIL: 1
};

var email = sharedState.get('objectAttributes').get('mail');
var notificationId = transientState.get('notificationId');
var isEmailResend = sharedState.get('resendEmail');

if (!isEmailResend) {
  isEmailResend = false;
}

_log('email : ' + email);
outcome = NodeOutcome.TRUE;

if (callbacks.isEmpty()) {
  action = fr.Action.send(
    new fr.TextOutputCallback(
      fr.TextOutputCallback.INFORMATION,
      'Check your email to reset the password - ' + email
    ),
    new fr.ConfirmationCallback(
      'Do you want to resend email or change address?',
      fr.ConfirmationCallback.INFORMATION,
      ['RESEND', 'CHANGE_EMAIL'],
      0),
    new fr.HiddenValueCallback(
      'stage',
      'RESET_PASSWORD_6'
    ),
    new fr.HiddenValueCallback(
      'pagePropsJSON',
      JSON.stringify({ 'email': email, 'resend': isEmailResend })
    ),
    new fr.HiddenValueCallback(
      'notificationId',
      notificationId
    )
  ).build();
} else {
  _log('Checking response from user');

  var confirmIndex = callbacks.get(1).getSelectedIndex();
  _log('Confirm resend choice: ' + confirmIndex);

  if (confirmIndex === ConfirmIndex.RESEND) {

    _log('User chose to resend');

    sharedState.put('resendEmail', true);
    outcome = NodeOutcome.RESEND;

  } else if (confirmIndex === ConfirmIndex.CHANGE_EMAIL) {

    _log('User chose to re-enter email address');

    sharedState.put('resendEmail', false);
    outcome = NodeOutcome.CHANGE_EMAIL;

  }
}

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END