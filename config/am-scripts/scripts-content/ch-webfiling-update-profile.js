var _scriptName = 'CH WEBFILING UPDATE PROFILE';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.NameCallback,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback,
  javax.security.auth.callback.ConfirmationCallback,
  java.lang.String
);

var NodeOutcome = {
  SKIP: 'skip',
  OTP: 'otp',
  NAME_ONLY: 'name_only',
  FAIL: 'fail'
};

function isMobile (number) {
  var mobileValid = /^((0044|0|\+44)7\d{3}\s?\d{6})$/.test(number);
  if (mobileValid) {
    return true;
  }
  return false;
}

function selectTypeCallback (nameFound, phoneFound) {
  if (!phoneFound && nameFound) {
    return new fr.HiddenValueCallback('PHONE', 'PHONE');
  } else if (phoneFound && !nameFound) {
    return new fr.HiddenValueCallback('NAME', 'NAME');
  } else if (!phoneFound && !nameFound) {
    return new fr.HiddenValueCallback('BOTH', 'BOTH');
  }
}

// main execution flow
try {
  var PHONE_NUMBER_FIELD = 'telephoneNumber';
  var FULL_NAME_FIELD = 'givenName';
  var nameFound = false;
  var phoneFound = false;

  var SKIP_OPTION_INDEX = 0;
  var CONFIRM_OPTION_INDEX = 1;

  var SKIP_CALLBACK_INDEX = 5;
  var NAME_CALLBACK_INDEX = 2;
  var PHONE_CALLBACK_INDEX = 3;

  var logPrefix = isOnboarding ? '[ONBOARDING UPDATE PROFILE]' : '[EWF UPDATE PROFILE]';
  var skipCallback = new fr.ConfirmationCallback(
    'Do you want to skip?',
    fr.ConfirmationCallback.INFORMATION,
    ['SKIP', 'SUBMIT'],
    CONFIRM_OPTION_INDEX
  );

  var placeHolderCallback = new fr.HiddenValueCallback('IGNOREME', 'IGNOREME');

  var userId = sharedState.get('_id');
  //checks presence of phone number in user profile
  if (idRepository.getAttribute(userId, PHONE_NUMBER_FIELD).iterator().hasNext()) {
    _log(logPrefix + ' Found phone number');
    phoneFound = true;
  } else {
    _log(logPrefix + ' phone number not found');
  }

  //checks presence of full name in user profile
  if (idRepository.getAttribute(userId, FULL_NAME_FIELD).iterator().hasNext()) {
    _log(logPrefix + ' Found givenName');
    nameFound = true;
  } else {
    _log(logPrefix + ' givenName not found');
  }

  if (callbacks.isEmpty()) {
    if (phoneFound && nameFound) {
      outcome = NodeOutcome.SKIP;
    } else {
      //initial callbacks
      var infoMessage = 'Update your personal details';
      var level = fr.TextOutputCallback.INFORMATION;
      var errorMessage = sharedState.get('errorMessage');
      var isOnboarding = sharedState.get('isOnboarding');

      var stageName = isOnboarding ? 'ONBOARDING_PROFILE' : 'EWF_PROFILE';
      _log(logPrefix + ' userId: ' + userId);

      if (errorMessage !== null) {
        var errorProps = sharedState.get('pagePropsJSON');
        level = fr.TextOutputCallback.ERROR;
        infoMessage = errorMessage.concat(' Please try again.');
        action = fr.Action.send(
          new fr.TextOutputCallback(level, infoMessage),
          selectTypeCallback(nameFound, phoneFound),
          nameFound ? placeHolderCallback : new fr.NameCallback('What is your full name? (optional)'),
          phoneFound ? placeHolderCallback : new fr.NameCallback('What is your mobile number? (optional)'),
          new fr.HiddenValueCallback('stage', stageName),
          skipCallback,
          new fr.HiddenValueCallback('pagePropsJSON', errorProps)
        ).build();
      } else {
        action = fr.Action.send(
          new fr.TextOutputCallback(level, infoMessage),
          selectTypeCallback(nameFound, phoneFound),
          nameFound ? placeHolderCallback : new fr.NameCallback('What is your full name? (optional)'),
          phoneFound ? placeHolderCallback : new fr.NameCallback('What is your mobile number? (optional)'),
          new fr.HiddenValueCallback('stage', stageName),
          skipCallback
        ).build();
      }
    }
  } else {
    // returning callbacks
    var selection = callbacks.get(SKIP_CALLBACK_INDEX).getSelectedIndex();
    _log(logPrefix + ' selection ' + selection);
    if (selection === SKIP_OPTION_INDEX) {
      _log(logPrefix + ' selected SKIP');
      outcome = NodeOutcome.SKIP;
    } else {
      _log(logPrefix + ' selected SUBMIT');
      var type = callbacks.get(1).getValue();
      _log(logPrefix + ' type: ' + type);
      var payload;
      if ((type === 'PHONE' || type === 'BOTH') && newPhoneNumber && !isMobile(newPhoneNumber)) {
        sharedState.put('errorMessage', 'Invalid mobile number entered.');
        sharedState.put('pagePropsJSON', JSON.stringify(
          {
            'errors': [{
              label: 'Invalid mobile number entered',
              token: 'UPDATE_PHONE_INVALID_MOBILE_NUMBER',
              fieldName: 'IDToken'.concat(PHONE_CALLBACK_INDEX),
              anchor: 'IDToken'.concat(PHONE_CALLBACK_INDEX)
            }]
          }));
        action = fr.Action.goTo(NodeOutcome.FAIL).build();
      } else {
        var newName, newPhoneNumber;
        if (type === 'NAME' || type === 'BOTH') {
          newName = callbacks.get(NAME_CALLBACK_INDEX).getName();
          _log(logPrefix + ' new name: ' + newName);
        }
        if (type === 'PHONE' || type === 'BOTH') {
          newPhoneNumber = callbacks.get(PHONE_CALLBACK_INDEX).getName();
          _log(logPrefix + ' new phone: ' + newPhoneNumber);
        }

        if (type === 'BOTH') {
          payload = {
            'telephoneNumber': newPhoneNumber,
            'givenName': newName
          };
        } else if (type === 'PHONE') {
          payload = {
            'telephoneNumber': newPhoneNumber
          };
        } else if (type === 'NAME') {
          payload = {
            'givenName': newName
          };
        }
        sharedState.put('objectAttributes', payload);

        //got the OTP route if the phone has been changed and phone is valid
        if (newPhoneNumber) {
          sharedState.put('registrationMFA', true);
          action = fr.Action.goTo(NodeOutcome.OTP).build();
        } else {
          action = fr.Action.goTo(NodeOutcome.NAME_ONLY).build();
        }
      }
    }
  }
} catch (e) {
  _log(logPrefix + ' error: ' + e);
  sharedState.put('errorMessage', e.toString());
}

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END