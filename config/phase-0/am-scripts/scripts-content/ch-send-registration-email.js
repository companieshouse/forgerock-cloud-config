var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action
)

var notifyJWT = transientState.get("notifyJWT");
var templates = transientState.get("notifyTemplates");

logger.error("JWT from transient state: " + notifyJWT);
logger.error("templates from transient state: " + templates);

var request = new org.forgerock.http.protocol.Request()
request.setUri("https://api.notifications.service.gov.uk/v2/notifications/email");
try{
  var requestBodyJson = {
    "email_address": "matteo.formica@amido.com",
    "template_id": JSON.parse(templates).invite,
    "personalisation": {
        "name": "test",
        "inviter": "whatever",
        "link": "blah",
        "company": "acme"
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