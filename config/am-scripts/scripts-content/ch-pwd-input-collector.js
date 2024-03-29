var _scriptName = 'CH PWD INPUT COLLECTOR';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.PasswordCallback,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback,
  java.lang.String
);

var NodeOutcome = {
  SUCCESS: 'success',
  ERROR: 'error'
};

function raiseErrorCallback (level, stage, userName, companyName, infoMessage, errorProps) {
  var newJSONProps = JSON.parse(errorProps);
  newJSONProps.company = {
    name: companyName
  };
  newJSONProps.user = {
    userName: userName
  };
  action = fr.Action.send(
    fr.TextOutputCallback(level, infoMessage),
    fr.PasswordCallback('New password', false),
    fr.PasswordCallback('Confirm new password', false),
    fr.HiddenValueCallback('stage', stage),
    fr.HiddenValueCallback('pagePropsJSON', JSON.stringify(newJSONProps))
  ).build();
}

try {
  var userName = sharedState.get('userName');

  if (!userName) {
    var userId = sharedState.get('_id');
    if (userId) {
      if (idRepository.getAttribute(userId, 'mail').iterator().hasNext()) {
        userName = idRepository.getAttribute(userId, 'mail').iterator().next();
      }
    }
  }

  // journey selector variables
  var isOnboarding = sharedState.get('isOnboarding');
  var isResetPassword = sharedState.get('isResetPassword');
  var isRegistration = sharedState.get('isRegistration');
  var isSCRSActivation = sharedState.get('isSCRSActivation');

  var invitedCompanyName = sharedState.get('invitedCompanyName');
  var stageName = (isOnboarding || isSCRSActivation) ? 'ONBOARDING_PWD' : (isResetPassword ? 'RESET_PASSWORD_4' : (isRegistration ? 'REGISTRATION_4' : 'N/A'));

  if (callbacks.isEmpty()) {
    var infoMessage = 'Please create new password for user '.concat(userName);
    var level = fr.TextOutputCallback.INFORMATION;
    var errorMessage = sharedState.get('errorMessage');
    if (errorMessage !== null) {
      var errorProps = sharedState.get('pagePropsJSON');
      level = fr.TextOutputCallback.ERROR;
      infoMessage = errorMessage.concat(' Please try again.');
      raiseErrorCallback(level, stageName, userName, invitedCompanyName, infoMessage, errorProps);
    } else {
      action = fr.Action.send(
        fr.TextOutputCallback(level, infoMessage),
        fr.PasswordCallback('New password', false),
        fr.PasswordCallback('Confirm new password', false),
        fr.HiddenValueCallback('stage', stageName),
        fr.HiddenValueCallback('pagePropsJSON',
          JSON.stringify(
            {
              'company': {
                name: invitedCompanyName
              },
              'user': {
                userName: userName
              }
            }
          )
        )
      ).build();
    }
  } else {

    var newPassword = fr.String(callbacks.get(1).getPassword());
    var confirmNewPassword = fr.String(callbacks.get(2).getPassword());

    if (newPassword && newPassword.trim().length === 0) {
      newPassword = null;
    }

    if (confirmNewPassword && confirmNewPassword.trim().length === 0) {
      confirmNewPassword = null;
    }

    var errors = [];

    if (!newPassword) {
      errors.push({
        label: 'The new password cannot be empty.',
        token: 'CREATE_PASSWORD_REQUIRED',
        fieldName: 'IDToken2',
        anchor: 'IDToken2'
      });
    }

    if (!confirmNewPassword) {
      errors.push({
        label: 'The confirmation password cannot be empty.',
        token: 'CREATE_REENTER_PASSWORD_REQUIRED',
        fieldName: 'IDToken3',
        anchor: 'IDToken3'
      });
    }

    if (newPassword && confirmNewPassword && (newPassword !== confirmNewPassword)) {
      errors.push({
        label: 'The new password and confirmation do not match.',
        token: 'PWD_MISMATCH',
        fieldName: 'IDToken3',
        anchor: 'IDToken3'
      });
    }

    if (errors.length > 0) {
      var infoMessage = 'There is an issue with the password supplied.';

      var errorProps = JSON.stringify(
        {
          'errors': errors
        });

      raiseErrorCallback(fr.TextOutputCallback.ERROR, stageName, userName, invitedCompanyName, infoMessage, errorProps);

    } else {

      transientState.put('newPassword', newPassword);
      action = fr.Action.goTo(NodeOutcome.SUCCESS).build();

    }
  }
} catch (e) {
  _log('ERROR: ' + e);
  var errorMessage = sharedState.put('errorMessage', e);
  action = fr.Action.goTo(NodeOutcome.ERROR).build();
}

// LIBRARY START
// LIBRARY END