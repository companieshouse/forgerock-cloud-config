/* 
  ** INPUT DATA
    * SHARED STATE:
      - '_id': the user ID to be send the text to (only populated if registrationMFA = false)
      - 'objectAttributes.telephoneNumber': the user telephone number (entered in a previous screen)

    * TRANSIENT STATE
      - 'notificationId' : the notification ID returned by Notify if the call was successful in a previous step
      - 'otpError': an OTP validaton error from a previous attempt (optional)  

  ** OUTCOMES
    - True: message shown 
  
  ** CALLBACKS:
    - error: if no phone number was found in context
    - error: if there is an OTP error in context (i.e. a previous attempt to validate the OTP has failed)
    - success: if there are no errors, including the notificationID and the phoneNumber used
*/

var _scriptName = 'CH PASSWORD RESET TEXT SENT';
_log('Starting', 'MESSAGE');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
);

function extractPhoneNumber () {
  var isRegistrationMFA = sharedState.get('registrationMFA');

  if (isRegistrationMFA) {
    return sharedState.get('objectAttributes').get('telephoneNumber');
  } else {
    try {
      var userId = sharedState.get('_id');
      if (idRepository.getAttribute(userId, 'telephoneNumber').iterator().hasNext()) {
        return idRepository.getAttribute(userId, 'telephoneNumber').iterator().next();
      } else {
        _log('Couldn\'t find telephoneNumber');
        return false;
      }
    } catch (e) {
      _log('Error retrieving telephoneNumber: ' + e);
      return false;
    }
  }
}

//main execution logic
var phoneNumber = extractPhoneNumber();

if (!phoneNumber) {
  if (callbacks.isEmpty()) {
    action = fr.Action.send(
      new fr.HiddenValueCallback(
        'pagePropsJSON',
        JSON.stringify({
          'errors': [{
            label: 'No phone number could be found in context.',
            token: 'OTP_SMS_NO_PHONE_FOUND'
          }]
        })
      ),
      new fr.TextOutputCallback(
        fr.TextOutputCallback.ERROR,
        'No phone number could be found in context.'
      )
    ).build();
  }
}

var notificationId = transientState.get('notificationId');
var otpError = transientState.get('error');
_log('Notification ID: ' + notificationId, 'MESSAGE');
_log('Found OTP Error : ' + otpError);

if (otpError) {
  if (callbacks.isEmpty()) {
    action = fr.Action.send(
      new fr.HiddenValueCallback(
        'pagePropsJSON',
        JSON.stringify(
          {
            'errors': [
              {
                label: otpError,
                token: 'OTP_NOT_VALID_SMS',
                fieldName: 'IDToken3',
                anchor: 'IDToken3'
              }
            ],
            'phoneNumber': _obfuscatePhone(phoneNumber)
          }
        )
      ),
      new fr.TextOutputCallback(
        fr.TextOutputCallback.ERROR,
        otpError
      )
    ).build();
  }
} else if (callbacks.isEmpty()) {
  action = fr.Action.send(
    new fr.HiddenValueCallback(
      'pagePropsJSON',
      JSON.stringify({ 'phoneNumber': _obfuscatePhone(phoneNumber) })
    ),
    new fr.HiddenValueCallback(
      'notificationId',
      notificationId
    )
  ).build();
} else {
  outcome = 'True';
}

// LIBRARY START
// LIBRARY END