var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback
)

var notifyJWT = transientState.get("notifyJWT");
var templates = transientState.get("notifyTemplates");
var code = sharedState.get("oneTimePassword");
var userId = sharedState.get("_id");
var emailAddress = "";

if (idRepository.getAttribute(userId, "mail").iterator().hasNext()) {
  emailAddress = idRepository.getAttribute(userId, "mail").iterator().next();
} else {
  logger.error("[SEND MFA EMAIL] Couldn't find email address");
  // TODO Better handling of error
}

logger.error("[SEND MFA EMAIL] User email address: " + emailAddress);
logger.error("[SEND MFA EMAIL] JWT from transient state: " + notifyJWT);
logger.error("[SEND MFA EMAIL] Templates from transient state: " + templates);
logger.error("[SEND MFA EMAIL] Code: " + code);

var request = new org.forgerock.http.protocol.Request();
request.setUri("https://api.notifications.service.gov.uk/v2/notifications/email");
try {
  var requestBodyJson = {
    "email_address": emailAddress,
    "template_id": JSON.parse(templates).otpEmail,
    "personalisation": {
        "code": code
    }
  }
} catch(e) {
  logger.error("[SEND MFA EMAIL] Error while preparing request for Notify: " + e);
}

request.setMethod("POST");
request.getHeaders().add("Content-Type", "application/json");
request.getHeaders().add("Authorization", "Bearer " + notifyJWT);
request.getEntity().setString(JSON.stringify(requestBodyJson))

var notificationId;
var response = httpClient.send(request).get();

try {
  notificationId = JSON.parse(response.getEntity().getString()).id;
  logger.error("[SEND MFA EMAIL] Notify ID: " + notificationId);
  transientState.put("notificationId", notificationId);
  transientState.put("mfa-route", "email");
} catch(e) {
  logger.error("[SEND MFA EMAIL] Error while parsing Notify response: " + e);
}

logger.error("[SEND MFA EMAIL] Notify Response: " + response.getStatus().getCode() + response.getCause() + response.getEntity().getString());

if (response.getStatus().getCode() == 201) {
  // if (callbacks.isEmpty()) {
  //   action = fr.Action.send(
  //     new fr.TextOutputCallback(
  //         fr.TextOutputCallback.INFORMATION,
  //         "Please check your email to obtain the MFA code - " + emailAddress
  //     ),
  //     new fr.HiddenValueCallback (
  //         "stage",
  //         "LOGIN_MFA_4"
  //     ),
  //     new fr.HiddenValueCallback (
  //         "pagePropsJSON",
  //         JSON.stringify({"email": emailAddress})
  //     ),
  //     new fr.HiddenValueCallback (
  //       "notificationId",
  //       notificationId
  //   )
  //   ).build()
  // }
  outcome = "true";
} else {
  if (callbacks.isEmpty()) {
    action = fr.Action.send(
      new fr.HiddenValueCallback (
          "stage",
          "SEND_MFA_EMAIL_ERROR"
      ),
        new fr.TextOutputCallback(
          fr.TextOutputCallback.ERROR,
          "The email could not be sent: " + response.getEntity().getString()
      ),
      new fr.HiddenValueCallback (
          "pagePropsJSON",
          JSON.stringify({ 'errors': [{ label: "An error occurred while sending the email. Please try again."} ] })
      )
    ).build()
  }
  outcome = "false";
}
