var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  java.lang.Math,
  org.forgerock.openam.auth.node.api,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback,
  org.forgerock.json.jose.builders.JwtBuilderFactory,
  org.forgerock.json.jose.jwt.JwtClaimsSet,
  org.forgerock.json.jose.jws.JwsAlgorithm,
  org.forgerock.secrets.SecretBuilder,
  javax.crypto.spec.SecretKeySpec,
  org.forgerock.secrets.keys.SigningKey,
  org.forgerock.json.jose.jws.handlers.SecretHmacSigningHandler,
  org.forgerock.util.encode.Base64,
  java.time.temporal.ChronoUnit,
  java.time.Clock
)

var NodeOutcome = {
  ERROR: "false"
}

//extracts the email from shared state
function extractRegDataFromState(){
  logger.error("host: " + host);
  logger.error("shared: " + sharedState.get("objectAttributes"));

  try{
    email = sharedState.get("objectAttributes").get("mail");
    fullName = sharedState.get("objectAttributes").get("givenName");
    phone = sharedState.get("objectAttributes").get("telephoneNumber");
    logger.error("mail : " + email + " - name: "+fullName+" - phone: "+phone);
    return {email: email, phone: phone, fullName: fullName }
  } catch(e){
    logger.error("[REGISTRATION] error in fetching objectAttributes : " + e); 
    return false;
  }
}

//builds the URL which will be sent via email
function buildReturnUrl(jwt){
  try{
    returnUrl = host.concat("/am/XUI/?realm=/alpha&&service=CHVerifyReg&token=", jwt)
    logger.error("[REGISTRATION] RETURN URL: " + returnUrl);
    return returnUrl;
  }catch(e){
    logger.error("[REGISTRATION] Error while extracting host: " + e);
    return false;
  }
}

// function that builds the Password Reset JWT
function buildRegistrationToken(email, phone, fullName){
  var jwt;
  var signingHandler;
  var secret = transientState.get("secretKey");
  try{
    var secretbytes = java.lang.String(secret).getBytes();
    var secretBuilder = new fr.SecretBuilder;
    secretBuilder.secretKey(new javax.crypto.spec.SecretKeySpec(secretbytes, "Hmac"));
    secretBuilder.stableId(host).expiresIn(5, fr.ChronoUnit.MINUTES, fr.Clock.systemUTC());
    var key = new fr.SigningKey(secretBuilder); 
    signingHandler = new fr.SecretHmacSigningHandler(key);
  }catch(e){
    logger.error("[REGISTRATION] Error while creating signing handler: " + e);
    return false;
  }
  var jwtClaims = new fr.JwtClaimsSet;
  try{
    jwtClaims.setIssuer(host);
    var dateNow = new Date();
    jwtClaims.setIssuedAtTime(dateNow);
    jwtClaims.setSubject(email);
    if(fullName){ 
      jwtClaims.setClaim("fullName", fullName);
    }
    if(phone){
      jwtClaims.setClaim("phone", phone);
    }
    jwtClaims.setClaim("creationDate", new Date().toString());
  }catch(e){
    logger.error("[REGISTRATION] Error while adding claims to JWT: " + e);
    return false;
  }
  
  try{
    jwt = new fr.JwtBuilderFactory()
          .jws(signingHandler)
          .headers()
          .alg(fr.JwsAlgorithm.HS256)
          .done()
          .claims(jwtClaims)
          .build();
    logger.error("[REGISTRATION] JWT from reg: " + jwt);
    return jwt;
  }catch(e){
    logger.error("[REGISTRATION] Error while creating JWT: " + e);
    return false;
  }
  
  // try{
  //   returnUrl = host.concat("/am/XUI/?realm=/alpha&&service=CHVerifyReg&token=", jwt)
  //   logger.error("[REGISTRATION] RETURN URL: " + returnUrl);
  // }catch(e){
  //   logger.error("[REGISTRATION] Error while extracting host: " + e);
  //   errorFound = true;
  // }
  
}

function raiseGeneralError(){
  if (callbacks.isEmpty()) {
    action = fr.Action.send(
      new fr.HiddenValueCallback (
            "stage",
            "REGISTRATION_ERROR" 
        ),
        new fr.TextOutputCallback(
          fr.TextOutputCallback.ERROR,
          "An error has occurred! Please try again later"
        ),
        new fr.HiddenValueCallback (
          "pagePropsJSON",
          JSON.stringify({ 'errors': [{ label: "An error has occurred! Please try again later" }] })
        )
   ).build()
  }
}

function sendEmail(jwt){

  var notifyJWT = transientState.get("notifyJWT");
  var templates = transientState.get("notifyTemplates");
  var returnUrl = host.concat("/am/XUI/?realm=/alpha&&service=CHVerifyReg&token=", jwt)

  logger.error("[REGISTRATION] JWT from transient state: " + notifyJWT);
  logger.error("[REGISTRATION] Templates from transient state: " + templates);
  logger.error("[REGISTRATION] RETURN URL: " + returnUrl);

  request.setUri("https://api.notifications.service.gov.uk/v2/notifications/email");
  try{
    var requestBodyJson = {
      "email_address": email,
      "template_id": JSON.parse(templates).verifyReg,
      "personalisation": {
          "link": returnUrl
      }
    }
  }catch(e){
    logger.error("[REGISTRATION] Error while preparing request for Notify: " + e);
    return false;
  }

  request.setMethod("POST");
  request.getHeaders().add("Content-Type", "application/json");
  request.getHeaders().add("Authorization", "Bearer " + notifyJWT);
  request.getEntity().setString(JSON.stringify(requestBodyJson));

  var response = httpClient.send(request).get();
  var notificationId;
  logger.error("[REGISTRATION] Notify Response: " + response.getStatus().getCode() + " - " +response.getEntity().getString());

  try{
    notificationId = JSON.parse(response.getEntity().getString()).id;
    logger.error("[REGISTRATION] Notify ID: " + notificationId);
  }catch(e){
    logger.error("[REGISTRATION] Error while parsing Notify response: " + e);
    return false;
  }
  
  if(response.getStatus().getCode() == 201){
    if (callbacks.isEmpty()) {
      action = fr.Action.send(
	      new fr.TextOutputCallback(
            fr.TextOutputCallback.INFORMATION,
            "Please check your email to complete registration - "+email 
        ),
        new fr.HiddenValueCallback (
            "stage",
            "REGISTRATION_3" 
        ),
        new fr.HiddenValueCallback (
            "pagePropsJSON",
            JSON.stringify({"email": email}) 
        ),
        new fr.HiddenValueCallback (
            "notificationId",
            notificationId 
        )
      ).build();
    } 
  }else{
    if (callbacks.isEmpty()) {
      action = fr.Action.send(
        new fr.HiddenValueCallback (
            "stage",
            "REGISTRATION_ERROR" 
        ),
        new fr.TextOutputCallback(
            fr.TextOutputCallback.ERROR,
            "The email could not be sent: "+response.getEntity().getString()
        ),
        new fr.HiddenValueCallback (
            "pagePropsJSON",
            JSON.stringify({ 'errors': [{ label: "An error occurred while sending the email. Please try again."} ] })
        )
      ).build()
    } 
  }
  return response.getStatus().getCode();
}

// mian execution flow

var returnUrl;
var registrationJwt;
var host = requestHeaders.get("origin").get(0); 
var request = new org.forgerock.http.protocol.Request();

logger.error("host: " + host);
logger.error("shared: " + sharedState.get("objectAttributes"));

var regData = extractRegDataFromState();
if(regData){
  registrationJwt = buildRegistrationToken(regData.email, regData.phone, regData.fullName);
}

if(!regData || !registrationJwt){
  raiseGeneralError();
}else{
  var res = sendEmail(registrationJwt);
  if(!res){
    raiseGeneralError();
  }
}

//always return false at the end, because we don't end up with a session
outcome = NodeOutcome.ERROR;