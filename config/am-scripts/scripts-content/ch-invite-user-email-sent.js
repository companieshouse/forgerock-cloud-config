var _scriptName = 'CH INVITE USER EMAIL SENT';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
);

var companyData = sharedState.get('companyData');
var inviterUserId = sharedState.get('_id');
var invitedEmail = sharedState.get('email');
var inviterName = sharedState.get('inviterName');
var notificationId = transientState.get('notificationId');

if (callbacks.isEmpty()) {
  action = fr.Action.send(
    new fr.TextOutputCallback(
      fr.TextOutputCallback.INFORMATION,
      'An email request has been sent to ' + invitedEmail + ' to be authorised to file online for ' + JSON.parse(companyData).name + '.'
    ),
    new fr.HiddenValueCallback(
      'stage',
      'INVITE_USER_2'
    ),
    new fr.HiddenValueCallback(
      'pagePropsJSON',
      JSON.stringify(
        {
          'invitedUser': invitedEmail,
          'company': {
            name: JSON.parse(companyData).name
          }
        })
    ),
    new fr.HiddenValueCallback(
      'notificationId',
      notificationId
    )
  ).build();
} else {
  outcome = 'true';
}

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END