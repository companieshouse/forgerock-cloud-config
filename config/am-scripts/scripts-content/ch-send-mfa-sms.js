var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action
)

var notifyJWT = transientState.get("notifyJWT");
var templates = transientState.get("notifyTemplates");
var isRegistrationMFA = transientState.get("registrationMFA");
var code = sharedState.get("oneTimePassword");
var userId = sharedState.get("_id");
var phoneNumber = "";

if(isRegistrationMFA){
  // if I'm in the registration journey,I need ro read the phone from sharedState
  phoneNumber = sharedState.get("objectAttributes").get("telephoneNumber");
} else {
  if (idRepository.getAttribute(userId, "telephoneNumber").iterator().hasNext()) {
    phoneNumber = idRepository.getAttribute(userId, "telephoneNumber").iterator().next();
  } else {
    logger.error("[SEND SMS] Couldn't find telephoneNumber");
    // TODO Better handling of error
  }
}

logger.error("[SEND SMS] User phoneNumber: " + phoneNumber);
logger.error("[SEND SMS] JWT from transient state: " + notifyJWT);
logger.error("[SEND SMS] Templates from transient state: " + templates);
logger.error("[SEND SMS] Code: " + code);

var request = new org.forgerock.http.protocol.Request();
request.setUri("https://api.notifications.service.gov.uk/v2/notifications/sms");
try{
  var requestBodyJson = {
    "phone_number": phoneNumber,
    "template_id": JSON.parse(templates).otpSms,
    "personalisation": {
        "code": code
    }
  }
}catch(e){
  logger.error("[SEND SMS] Error while preparing request for Notify: " + e);
}

request.setMethod("POST");
request.getHeaders().add("Content-Type", "application/json");
request.getHeaders().add("Authorization", "Bearer " + notifyJWT);
request.getEntity().setString(JSON.stringify(requestBodyJson))

var notificationId;
var response = httpClient.send(request).get();

try{
  notificationId = JSON.parse(response.getEntity().getString()).id;
  logger.error("[SEND SMS] Notify ID: " + notificationId);
  transientState.put("notificationId", notificationId);
  transientState.put("mfa-route", "sms");
}catch(e){
  logger.error("[SEND SMS] Error while parsing Notify response: " + e);
}

logger.error("[SEND SMS] Notify Response: " + response.getStatus().getCode() + response.getCause() + response.getEntity().getString());

if(response.getStatus().getCode() == 201){
   outcome = "true";
}else{
   outcome = "false";
}
