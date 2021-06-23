/* 
  ** INPUT DATA
    * SHARED STATE:
      - 'oneTimePassword' : the OTP code to be sent via email
      - '_id': the user ID to be send the email to (only populated if registrationMFA = false)

    * TRANSIENT STATE
      - 'registrationMFA' : flag indicating if this script is invoked as part of the registration journey (i.e. the user does not exist in IDM yet)
      - 'notifyJWT': the Notify JWT to be used for requests to Notify
      - 'templates': the list of all Notify templates 

  ** OUTPUT DATA
    * TRANSIENT STATE:
      - 'notificationId': the notification ID returned by Notify if the call was successful
      
    * SHARED STATE:
      - 'mfa-route': the boolean indicating whether this is a SMS or a Email MFA route (email in this case)

    ** OUTCOMES
    - true: message sent successfully
    - false: error in sending message
  
  ** CALLBACKS:
    - error (stage SEND_MFA_SMS_ERROR, error while sending email) 
*/

var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback
)

//extracts the language form headers (default to EN)
function getSelectedLanguage(requestHeaders) {
  if (requestHeaders && requestHeaders.get("Chosen-Language")) {
      var lang = requestHeaders.get("Chosen-Language").get(0);
      logger.error("[SEND MFA EMAIL] selected language: " + lang);
      return lang;
  }
  logger.error("[SEND MFA EMAIL] no selected language found - defaulting to EN");
  return 'EN';
}

var notifyJWT = transientState.get("notifyJWT");
var templates = transientState.get("notifyTemplates");
var code = sharedState.get("oneTimePassword");
var userId = sharedState.get("_id");
var emailAddress = "";
var language = getSelectedLanguage(requestHeaders);

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
    "template_id": language === 'EN' ? JSON.parse(templates).en_otpEmail : JSON.parse(templates).cy_otpEmail,
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
  sharedState.put("mfa-route", "email");
} catch(e) {
  logger.error("[SEND MFA EMAIL] Error while parsing Notify response: " + e);
}

logger.error("[SEND MFA EMAIL] Notify Response: " + response.getStatus().getCode() + response.getCause() + response.getEntity().getString());

if (response.getStatus().getCode() == 201) {
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
          JSON.stringify({ 'errors': [{ label: "An error occurred while sending the email. Please try again.", token: "SEND_MFA_EMAIL_ERROR"} ] })
      )
    ).build()
  }
  outcome = "false";
}
