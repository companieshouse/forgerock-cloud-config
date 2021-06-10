/* 
  ** INPUT DATA
    * SHARED STATE:
      - 'oneTimePassword' : the OTP code to be sent via text
      - '_id': the user ID to be send the text to (only populated if registrationMFA = false)
      - 'objectAttributes.telephoneNumber': the user telephone number (entered in a previous screen)

    * TRANSIENT STATE
      - 'registrationMFA' : flag indicating if this script is invoked as part of the registration journey (i.e. the user does not exist in IDM yet)
      - 'notifyJWT': the Notify JWT to be used for requests to Notify
      - 'templates': the list of all Notify templates 

  ** OUTPUT DATA
    * TRANSIENT STATE:
      - 'notificationId': the notification ID returned by Notify if the call was successful
      - 'mfa-route': the boolean indicating whether this is a SMS or a Email MFA route (SMS in this case)
    

  ** OUTCOMES
    - true: message sent successfully
    - false: error in sending message
  
  ** CALLBACKS:
    - error (stage SEND_MFA_SMS_ERROR, error while sending SMS) 
*/

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
)

// sends the error callbacks
function sendErrorCallbacks() {
  if (callbacks.isEmpty()) {
    action = fr.Action.send(
      new fr.HiddenValueCallback(
        "stage",
        "SEND_MFA_SMS_ERROR"
      ),
      new fr.TextOutputCallback(
        fr.TextOutputCallback.ERROR,
        "The SMS could not be sent. Please try again."
      ),
      new fr.HiddenValueCallback(
        "pagePropsJSON",
        JSON.stringify({ 'errors': [{ label: "An error occurred while sending the SMS. Please try again.", token: "SEND_MFA_SMS_ERROR" }] })
      )
    ).build()
  }
}

// sends the OTP code via text to the number specified
function sendTextMessage(phoneNumber, code) {
  var notifyJWT = transientState.get("notifyJWT");
  var templates = transientState.get("notifyTemplates");
  logger.error("[SEND MFA SMS] JWT from transient state: " + notifyJWT);
  logger.error("[SEND MFA SMS] Templates from transient state: " + templates);
  var request = new org.forgerock.http.protocol.Request();
  request.setUri("https://api.notifications.service.gov.uk/v2/notifications/sms");
  try {
    var requestBodyJson = {
      "phone_number": phoneNumber,
      "template_id": JSON.parse(templates).otpSms,
      "personalisation": {
        "code": code
      }
    }
  } catch (e) {
    logger.error("[SEND MFA SMS] Error while preparing request for Notify: " + e);
    return false;
  }

  request.setMethod("POST");
  request.getHeaders().add("Content-Type", "application/json");
  request.getHeaders().add("Authorization", "Bearer " + notifyJWT);
  request.getEntity().setString(JSON.stringify(requestBodyJson))

  var notificationId;
  var response = httpClient.send(request).get();
  logger.error("[SEND MFA SMS] Notify Response: " + response.getStatus().getCode() + response.getCause() + response.getEntity().getString());

  try {
    notificationId = JSON.parse(response.getEntity().getString()).id;
    logger.error("[SEND MFA SMS] Notify ID: " + notificationId);
    transientState.put("notificationId", notificationId);
    sharedState.put("mfa-route", "sms");
  } catch (e) {
    logger.error("[SEND MFA SMS] Error while parsing Notify response: " + e);
    return false;
  }

  logger.error("[SEND MFA SMS] Notify Response: " + response.getStatus().getCode() + response.getCause() + response.getEntity().getString());

  if (response.getStatus().getCode() == 201) {
    return true;
  }

  return false;
}

// extracts the number from the user profile (for password reset) or from shared state (for registration)
function extractPhoneNumber() {
  var userId = sharedState.get("_id");
  var isRegistrationMFA = transientState.get("registrationMFA");
  var isUpdatePhoneNumber = transientState.get("updatePhoneNumber");
  if (isRegistrationMFA) {
    return sharedState.get("objectAttributes").get("telephoneNumber");
  } else if (isUpdatePhoneNumber) {
    return sharedState.get("objectAttributes").get("telephoneNumber");
  } else {
    if (idRepository.getAttribute(userId, "telephoneNumber").iterator().hasNext()) {
      return idRepository.getAttribute(userId, "telephoneNumber").iterator().next();
    } else {
      logger.error("[SEND MFA SMS] Couldn't find telephoneNumber");
      return false;
    }
  }
}

// main execution flow
var code = sharedState.get("oneTimePassword");
logger.error("[SEND MFA SMS] Code: " + code);

var phoneNumber = extractPhoneNumber();
if (!phoneNumber || !code) {
  sendErrorCallbacks();
}

logger.error("[SEND MFA SMS] User phoneNumber: " + phoneNumber);

if (sendTextMessage(phoneNumber, code)) {
  action = fr.Action.goTo("true").build();
} else {
  sendErrorCallbacks();
}