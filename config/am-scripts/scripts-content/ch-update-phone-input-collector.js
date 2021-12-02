var _scriptName = 'CH UPDATE PHONE INPUT COLLECTOR';
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

function isMobile (number) {
  return /^((0044|0|\+44)7\d{3}\s?\d{6})$/.test(number);
}

var PHONE_NUMBER_FIELD = 'telephoneNumber';

var debug = String('Shared state: ' + sharedState.toString() + '\\n');
_log(debug);

var debug2 = String('Shared state: ' + transientState.toString() + '\\n');
_log(debug2);

if (callbacks.isEmpty()) {
  var infoMessage = 'Please enter your new phone number. Enter your password to make this change';
  var level = fr.TextOutputCallback.INFORMATION;

  var userId = sharedState.get('_id');
  _log('userId: ' + userId);

  var currentNumberMessage = 'You do not have a phone number stored in your Companies House account. ';
  if (idRepository.getAttribute(userId, PHONE_NUMBER_FIELD).iterator().hasNext()) {
    var currentPhoneNumber = idRepository.getAttribute(userId, PHONE_NUMBER_FIELD).iterator().next();
    _log('Found currentPhoneNumber: ' + currentPhoneNumber);
    if (currentPhoneNumber) {
      transientState.put('currentPhoneNumber', currentPhoneNumber);
      infoMessage = 'The phone number currently stored in your Companies House account is '
        .concat(currentPhoneNumber).concat('. ')
        .concat(infoMessage);
    } else {
      infoMessage = currentNumberMessage.concat(infoMessage);
    }
  }

  var errorMessage = sharedState.get('errorMessage');
  var errorType, errorField;
  if (errorMessage !== null) {
    var errorProps = sharedState.get('pagePropsJSON');
    level = fr.TextOutputCallback.ERROR;
    infoMessage = errorMessage.concat(' Please try again.');
    action = fr.Action.send(
      fr.TextOutputCallback(level, infoMessage),
      fr.NameCallback('Enter new phone number'),
      fr.PasswordCallback('Enter your password', false),
      fr.HiddenValueCallback('stage', 'UPDATE_PHONE_1'),
      fr.HiddenValueCallback('pagePropsJSON', errorProps)
    ).build();
  } else {
    action = fr.Action.send(
      fr.TextOutputCallback(level, infoMessage),
      fr.NameCallback('Enter new phone number'),
      fr.PasswordCallback('Enter your password', false),
      fr.HiddenValueCallback('stage', 'UPDATE_PHONE_1')
    ).build();
  }
} else {
  var newPhoneNumber = callbacks.get(1).getName();
  var currentPassword = fr.String(callbacks.get(2).getPassword());

  _log('New phone number ' + newPhoneNumber);
  if (!newPhoneNumber || !isMobile(newPhoneNumber)) {
    sharedState.put('errorMessage', 'Invalid mobile number entered.');
    sharedState.put('pagePropsJSON', JSON.stringify(
      {
        'errors': [{
          label: 'Invalid mobile number entered',
          token: 'UPDATE_PHONE_INVALID_MOBILE_NUMBER',
          fieldName: 'IDToken2',
          anchor: 'IDToken2'
        }]
      }));
    _log('FAILED: Invalid mobile number entered.');
    action = fr.Action.goTo(NodeOutcome.FAIL).build();
  } else if (!currentPassword) {
    sharedState.put('errorMessage', 'Invalid credential entered.');
    sharedState.put('pagePropsJSON', JSON.stringify(
      {
        'errors': [{
          label: 'Invalid credential entered.',
          token: 'UPDATE_PHONE_INVALID_CREDENTIALS',
          fieldName: 'IDToken3',
          anchor: 'IDToken3'
        }]
      }));
    _log('FAILED: Invalid credential entered.');
    action = fr.Action.goTo(NodeOutcome.FAIL).build();
  } else {
    _log('SUCCESS');
    sharedState.put('objectAttributes',
      {
        'telephoneNumber': newPhoneNumber
      });

    sharedState.put('updatePhoneNumber', true);
    sharedState.put('password', currentPassword);

    action = fr.Action.goTo(NodeOutcome.SUCCESS).build();
  }
}

// LIBRARY START
// LIBRARY END