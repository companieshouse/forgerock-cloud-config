var _scriptName = 'CH INVITE USER RESPOND CONFIRMATION';
_log('Starting', 'MESSAGE');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
);

var NodeOutcome = {
  success: 'success'
};

var InviteActions = {
  ACCEPT: 'accept',
  DECLINE: 'decline',
  SEND: 'send'
};

function fetchActionParameter () {
  var action = requestParameters.get('action');

  _log('action = ' + action, 'MESSAGE');

  if (!action) {
    _log('No invite action found in request');
    return false;
  } else {
    if (!action.get(0).equals('accept') && !action.get(0).equals('decline')) {
      _log('Unsupported action found in request: ' + action.get(0));
      return 'error';
    }
  }

  _log('Invite action found in request: ' + action.get(0));
  return action.get(0);
}

// main execution flow
try {
  var companyData = sharedState.get('companyData');
  var invitedEmail = sharedState.get('email');
  var userId = sharedState.get('_id');
  var actionParam = fetchActionParameter();
  var infoMessage = '';

  if (actionParam === InviteActions.ACCEPT) {
    infoMessage = 'You are now authorised to file for '
      .concat(JSON.parse(companyData).name)
      .concat('. This company has been added to your account.');

  } else if (actionParam === InviteActions.DECLINE) {
    infoMessage = 'You have declined the request to have authorisation to file online for '
      .concat(JSON.parse(companyData).name)
      .concat('.');
  }

  _log('infoMessage = ' + infoMessage, 'MESSAGE');

  action = fr.Action.send(
    new fr.TextOutputCallback(
      fr.TextOutputCallback.INFORMATION,
      infoMessage
    ),
    new fr.HiddenValueCallback(
      'stage',
      'INVITE_USER_3'
    ),
    new fr.HiddenValueCallback(
      'pagePropsJSON',
      JSON.stringify({
        'company': {
          name: JSON.parse(companyData).name
        }
      })
    )
  ).build();
} catch (e) {
  _log('Error : ' + e);
  sharedState.put('errorMessage', e.toString());
  outcome = NodeOutcome.ERROR;
}

_log('Completed');

// LIBRARY START
// LIBRARY END