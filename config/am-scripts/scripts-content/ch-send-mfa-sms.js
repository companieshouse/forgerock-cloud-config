var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action
)

var notifyJWT = transientState.get("notifyJWT");
var templates = transientState.get("notifyTemplates");
var code = sharedState.get("oneTimePassword");
var userId = sharedState.get("_id");
var phoneNumber = "";
if (idRepository.getAttribute(userId, "telephoneNumber").iterator().hasNext()) {
  phoneNumber = idRepository.getAttribute(userId, "telephoneNumber").iterator().next();
} else {
  logger.error("Couldn't find telephoneNumber");
  // TODO Better handling of error
}

logger.error("User phoneNumber: " + phoneNumber);
logger.error("JWT from transient state: " + notifyJWT);
logger.error("Templates from transient state: " + templates);
logger.error("Code: " + code);

var request = new org.forgerock.http.protocol.Request()
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
  logger.error(e);
}

request.setMethod("POST");
request.getHeaders().add("Content-Type", "application/json");
request.getHeaders().add("Authorization", "Bearer " + notifyJWT);
request.getEntity().setString(JSON.stringify(requestBodyJson))

var response = httpClient.send(request).get();

logger.error("Response: " + response.getStatus().getCode() + response.getCause() + response.getEntity().getString());

if(response.getStatus().getCode() == 201){
   outcome = "true";
}else{
   outcome = "false";
}
