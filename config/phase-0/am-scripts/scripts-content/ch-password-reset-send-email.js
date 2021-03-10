var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  java.lang.Math,
  org.forgerock.openam.auth.node.api,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback,
  org.forgerock.json.jose.builders.JwtBuilderFactory,
  org.forgerock.json.jose.jws.handlers.HmacSigningHandler,
  org.forgerock.json.jose.jwt.JwtClaimsSet,
  org.forgerock.json.jose.jws.JwsAlgorithm
)

var email;
var returnUrl;
var jwt;
var signingHandler;
var host = requestHeaders.get("origin").get(0); 
var notifyJWT = transientState.get("notifyJWT");
var templates = transientState.get("notifyTemplates");
var secret = transientState.get("secretKey");
var errorFound = false;

logger.error("[RESET PWD] host: " + host);
logger.error("[RESET PWD] shared: " + sharedState.get("objectAttributes"));

try{
  email = sharedState.get("objectAttributes").get("mail");
  logger.error("[RESET PWD] mail : " + email);
} catch(e){
  logger.error("[RESET PWD] error in fetching objectAttributes : " + e); 
  errorFound = true;
}

logger.error("[RESET PWD] Notify JWT from transient state: " + notifyJWT);
logger.error("[RESET PWD] Templates from transient state: " + templates);

try{
  var secretbytes = java.lang.String(secret).getBytes();
  signingHandler = new fr.HmacSigningHandler(secretbytes);
}catch(e){
  logger.error("[RESET PWD] Error while creating signing handler: " + e);
  errorFound = true;
}

var jwtClaims = new fr.JwtClaimsSet;
try{
  jwtClaims.setIssuer(host);
  var dateNow = new Date();
  jwtClaims.setIssuedAtTime(dateNow);
  jwtClaims.setSubject(email);
  jwtClaims.setClaim("creationDate", new Date().toString());
}catch(e){
  logger.error("[RESET PWD] Error while adding claims to JWT: " + e);
  errorFound = true;
}

try{
  jwt = new fr.JwtBuilderFactory()
        .jws(signingHandler)
        .headers()
        .alg(fr.JwsAlgorithm.HS256)
        .done()
        .claims(jwtClaims)
        .build();
  logger.error("[RESET PWD] JWT from reg: " + jwt);
}catch(e){
  logger.error("[RESET PWD] Error while creating JWT: " + e);
  errorFound = true;
}

try{
  returnUrl = host.concat("/am/XUI/?realm=/alpha&&service=CHCompleteResetPwd&token=", jwt)
  logger.error("[RESET PWD] URL: " + returnUrl);
}catch(e){
  logger.error("[RESET PWD] Error while extracting host: " + e);
  errorFound = true;
}

var request = new org.forgerock.http.protocol.Request();
request.setUri("https://api.notifications.service.gov.uk/v2/notifications/email");
try{
  var requestBodyJson = {
    "email_address": email,
    "template_id": JSON.parse(templates).resetPwd,
    "personalisation": {
        "link": returnUrl
    }
  }
}catch(e){
  logger.error("[RESET PWD] Error while preparing request for Notify: " + e);
}

request.setMethod("POST");
request.getHeaders().add("Content-Type", "application/json");
request.getHeaders().add("Authorization", "Bearer " + notifyJWT);
request.getEntity().setString(JSON.stringify(requestBodyJson))

if(!errorFound){
  var response = httpClient.send(request).get();
  var notificationId;
  logger.error("[RESET PWD] Response: " + response.getStatus().getCode() + " - " + response.getCause() + " - " +response.getEntity().getString());

  try{
    notificationId = JSON.parse(response.getEntity().getString()).id;
    logger.error("[RESET PWD] Notify ID: " + notificationId);
  }catch(e){
    logger.error("[RESET PWD] Error while parsing Notify response: " + e);
  }

  if(response.getStatus().getCode() == 201){
    if (callbacks.isEmpty()) {
      action = fr.Action.send(
        new fr.TextOutputCallback(
            fr.TextOutputCallback.INFORMATION,
            "Please check your email to complete reset password - "+email 
        ),
        new fr.HiddenValueCallback (
            "stage",
            "RESET_PASSWORD_6" 
        ),
        new fr.HiddenValueCallback (
            "pagePropsJSON",
            JSON.stringify({"email": email}) 
        ),
        new fr.HiddenValueCallback (
          "notificationId",
          notificationId 
      )
      ).build()
    } 
  }else{
    if (callbacks.isEmpty()) {
      action = fr.Action.send(
        new fr.HiddenValueCallback (
            "stage",
            "RESET_PASSWORD_ERROR" 
        ),
          new fr.TextOutputCallback(
            fr.TextOutputCallback.ERROR,
            "The email could not be sent: "+response.getEntity().getString()
        ),
        new fr.HiddenValueCallback (
            "pagePropsJSON",
            JSON.stringify({"apiError": JSON.parse(response.getEntity().getString())})
        )
      ).build()
    } 
  }
} else {
if (callbacks.isEmpty()) {
  action = fr.Action.send(
    new fr.HiddenValueCallback (
          "stage",
          "RESET_PASSWORD_ERROR" 
      ),
      new fr.TextOutputCallback(
        fr.TextOutputCallback.ERROR,
        "An error has occurred! Please try again later"
      )
    ).build()
  }
}
outcome = "false";