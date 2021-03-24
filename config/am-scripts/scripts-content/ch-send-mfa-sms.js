var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
)

var notifyJWT = transientState.get("notifyJWT");
var templates = transientState.get("notifyTemplates");
var code = sharedState.get("oneTimePassword");
var userId = sharedState.get("_id");
var phoneNumber = "";

if (idRepository.getAttribute(userId, "telephoneNumber").iterator().hasNext()) {
    phoneNumber = idRepository.getAttribute(userId, "telephoneNumber").iterator().next();
} else {
  logger.error("[SEND MFA SMS] Couldn't find telephoneNumber");
  // TODO Better handling of error
}

logger.error("[SEND MFA SMS] User phoneNumber: " + phoneNumber);
logger.error("[SEND MFA SMS] JWT from transient state: " + notifyJWT);
logger.error("[SEND MFA SMS] Templates from transient state: " + templates);
logger.error("[SEND MFA SMS] Code: " + code);

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
} catch(e) {
  logger.error("[SEND MFA SMS] Error while preparing request for Notify: " + e);
}

request.setMethod("POST");
request.getHeaders().add("Content-Type", "application/json");
request.getHeaders().add("Authorization", "Bearer " + notifyJWT);
request.getEntity().setString(JSON.stringify(requestBodyJson))

var notificationId;
var response = httpClient.send(request).get();

try {
  notificationId = JSON.parse(response.getEntity().getString()).id;
  logger.error("[SEND MFA SMS] Notify ID: " + notificationId);
  transientState.put("notificationId", notificationId);
  transientState.put("mfa-route", "sms");
} catch(e) {
  logger.error("[SEND MFA SMS] Error while parsing Notify response: " + e);
}

logger.error("[SEND MFA SMS] Notify Response: " + response.getStatus().getCode() + response.getCause() + response.getEntity().getString());

if (response.getStatus().getCode() == 201) {
  outcome = "true";
} else {
  if (callbacks.isEmpty()) {
    action = fr.Action.send(
      new fr.HiddenValueCallback (
          "stage",
          "SEND_MFA_SMS_ERROR"
      ),
        new fr.TextOutputCallback(
          fr.TextOutputCallback.ERROR,
          "The email could not be sent: " + response.getEntity().getString()
      ),
      new fr.HiddenValueCallback (
          "pagePropsJSON",
          JSON.stringify({ 'errors': [{ label: "An error occurred while sending the SMS. Please try again."} ] })
      )
    ).build()
  }
  outcome = "false";
}
