var _scriptName = 'CH CHECK OTP RESEND ADDRESS';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  java.lang.Math,
  org.forgerock.openam.auth.node.api,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback,
  javax.security.auth.callback.ConfirmationCallback
);

var NodeOutcome = {
  ERROR: 'error',
  RESEND: 'resend'
};

var ConfirmIndex = {
  RESEND: 0
};

var stageName = 'REGISTRATION_RESEND';

// For now we will just force a resend until the UI is updated - SJD 16/12/21
outcome = NodeOutcome.RESEND;

/*

try {
  var mfaRoute = sharedState.get('mfa-route');
  var userId = sharedState.get('_id');

  _log('MFA Route : ' + mfaRoute + ', userId : ' + userId);

  var phoneNumber = '';
  var mfaRouteText = 'MFA Route not supported : ' + mfaRoute + ' for userId : ' + userId;

  if (mfaRoute === 'sms') {
    if (idRepository.getAttribute(userId, 'telephoneNumber').iterator().hasNext()) {
      phoneNumber = idRepository.getAttribute(userId, 'telephoneNumber').iterator().next();
    } else {
      _log('Failed to get phoneNumber for userId : ' + userId);
    }

    mfaRouteText = 'Do you want to resend the SMS to '.concat(phoneNumber).concat('?');
  } else if (mfaRoute === 'email') {
    if (idRepository.getAttribute(userId, 'mail').iterator().hasNext()) {
      email = idRepository.getAttribute(userId, 'mail').iterator().next();
    } else {
      _log('Failed to get email for userId : ' + userId);
    }

    mfaRouteText = 'Do you want to resend the email to '.concat(email).concat('?');
  }

  _log('MFA Route Text : ' + mfaRouteText);

  if (callbacks.isEmpty()) {
    action = fr.Action.send(
      new fr.TextOutputCallback(fr.TextOutputCallback.INFORMATION, mfaRouteText),
      new fr.ConfirmationCallback(
        'Do you want to resend?',
        fr.ConfirmationCallback.INFORMATION,
        ['RESEND'],
        0),
      new fr.HiddenValueCallback('stage', stageName),
      new fr.HiddenValueCallback(
        'pagePropsJSON',
        JSON.stringify(
          {
            'emailAddress': email,
            'phoneNumber': phoneNumber
          }
        )
      )
    ).build();
  } else {
    var confirmIndex = callbacks.get(1).getSelectedIndex();
    _log('Confirm resend choice: ' + confirmIndex);

    if (confirmIndex === ConfirmIndex.RESEND) {
      outcome = NodeOutcome.RESEND;
    } else {
      outcome = NodeOutcome.ERROR;
    }
  }
} catch (e) {
  _log('ERROR ' + e);
  outcome = NodeOutcome.ERROR;
}

*/

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END