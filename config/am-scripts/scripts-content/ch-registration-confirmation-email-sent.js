var _scriptName = 'CH REGISTRATION CONFIRMATION EMAIL SENT';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback,
  javax.security.auth.callback.ConfirmationCallback
);

var NodeOutcome = {
  RESEND: 'resend',
  CHANGE_EMAIL: 'change_email'
};

var ConfirmIndex = {
  RESEND: 0,
  OK: 1
};

try {
  var email = sharedState.get('objectAttributes').get('mail');
  var notificationId = transientState.get('notificationId');
  var isEmailResend = sharedState.get('resendEmail');

  if (callbacks.isEmpty()) {
    action = fr.Action.send(
      new fr.TextOutputCallback(
        fr.TextOutputCallback.INFORMATION,
        'Please check your email to complete registration - ' + email
      ),
      new fr.HiddenValueCallback(
        'stage',
        'REGISTRATION_3'
      ),
      new fr.HiddenValueCallback(
        'pagePropsJSON',
        JSON.stringify(
          {
            'email': email,
            'resend': isEmailResend
          })
      ),
      new fr.HiddenValueCallback(
        'notificationId',
        notificationId
      ),
      new fr.ConfirmationCallback(
        'Do you want to resend the email, or use a different address?',
        fr.ConfirmationCallback.INFORMATION,
        ['RESEND', 'CHANGE_EMAIL'],
        0)
    ).build();
  } else {
    var confirmIndex = callbacks.get(4).getSelectedIndex();
    if (confirmIndex === ConfirmIndex.RESEND) {
      outcome = NodeOutcome.RESEND;
    } else {
      outcome = NodeOutcome.CHANGE_EMAIL;
    }
  }
} catch (e) {
  _log('ERROR ' + e);
  action = fr.Action.send(
    new fr.TextOutputCallback(
      fr.TextOutputCallback.ERROR,
      e.toString()
    )
  ).build();
}

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END