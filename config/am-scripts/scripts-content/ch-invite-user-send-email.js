/* 
  ** INPUT DATA
    * SHARED STATE:
      - 'companyData': the company data which has been previously looked up from IDM
      - '_id': id of the current user (session owner)
      - 'email': email of the invited user
      - 'inviterName': the full name of the inviter (or email of name is not set)

    * TRANSIENT STATE
      - 'notifyJWT': the Notify JWT to be used for requests to Notify
      - 'notifyTemplates': the list of all Notify templates 

  ** OUTPUT DATA
    * TRANSIENT STATE:
      - 'notificationId': the notification ID returned by Notify if the call was successful
    
  ** OUTCOMES
    - true: message sent successfully
  
  ** CALLBACKS:
    - error while sending 
    - generic error
*/

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  java.lang.Math,
  org.forgerock.openam.auth.node.api,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback,
  org.forgerock.util.encode.Base64,
  java.time.temporal.ChronoUnit,
  java.time.Clock
)

var NodeOutcome = {
  ERROR: "false",
  SUCCESS: "true"
}

// extracts the email from shared state
function extractInviteDataFromState() {
  try {
    var inviterUserId = sharedState.get("_id");
    var inviterName = sharedState.get("inviterName");
    var invitedEmail = sharedState.get("email");
    var companyData = sharedState.get("companyData");
    return {
      invitedEmail: invitedEmail,
      inviterUserId: inviterUserId,
      inviterName: inviterName,
      companyNumber: JSON.parse(companyData).number,
      companyName: JSON.parse(companyData).name
    }
  } catch (e) {
    logger.error("[COMPANY INVITE - SEND EMAIL] error in fetching objectAttributes : " + e);
    return false;
  }
}

//raises a generic registration error
function sendErrorCallbacks(stage, token, message) {
  if (callbacks.isEmpty()) {
    action = fr.Action.send(
      new fr.HiddenValueCallback(
        "stage",
        stage
      ),
      new fr.TextOutputCallback(
        fr.TextOutputCallback.ERROR,
        message
      ),
      new fr.HiddenValueCallback(
        "pagePropsJSON",
        JSON.stringify({ 'errors': [{ label: message, token: token }] })
      )
    ).build()
  }
}

//sends the email (via Notify) to the recipient using the given JWT
function sendEmail(invitedEmail, companyName, companyNumber, inviterName) {

  logger.error("[COMPANY INVITE - SEND EMAIL] params: " + invitedEmail + " - " + companyName + " - " + inviterName);

  var notifyJWT = transientState.get("notifyJWT");
  var templates = transientState.get("notifyTemplates");
  var returnUrl = host.concat("/account/login/?goto=", encodeURIComponent("/account/notifications/#" + companyNumber));

  logger.error("[COMPANY INVITE - SEND EMAIL] JWT from transient state: " + notifyJWT);
  logger.error("[COMPANY INVITE - SEND EMAIL] Templates from transient state: " + templates);
  logger.error("[COMPANY INVITE - SEND EMAIL] RETURN URL: " + returnUrl);

  request.setUri("https://api.notifications.service.gov.uk/v2/notifications/email");
  try {
    var requestBodyJson = {
      "email_address": invitedEmail,
      "template_id": JSON.parse(templates).invite,
      "personalisation": {
        "link": returnUrl,
        "company": companyName,
        "inviter": inviterName
      }
    }
  } catch (e) {
    logger.error("[COMPANY INVITE - SEND EMAIL] Error while preparing request for Notify: " + e);
    return false;
  }

  request.setMethod("POST");
  request.getHeaders().add("Content-Type", "application/json");
  request.getHeaders().add("Authorization", "Bearer " + notifyJWT);
  request.setEntity(requestBodyJson);

  var response = httpClient.send(request).get();
  var notificationId;
  logger.error("[COMPANY INVITE - SEND EMAIL] Notify Response: " + response.getStatus().getCode() + " - " + response.getEntity().getString());

  try {
    notificationId = JSON.parse(response.getEntity().getString()).id;
    transientState.put("notificationId", notificationId);
    logger.error("[COMPANY INVITE - SEND EMAIL] Notify ID: " + notificationId);
  } catch (e) {
    logger.error("[COMPANY INVITE - SEND EMAIL] Error while parsing Notify response: " + e);
    return false;
  }

  return (response.getStatus().getCode() == 201);
}

// main execution flow

try {
  var returnUrl;
  var inviteJwt;
  var host = requestHeaders.get("origin").get(0);
  var request = new org.forgerock.http.protocol.Request();

  var inviteData = extractInviteDataFromState();

  if (!inviteData) {
    sendErrorCallbacks("INVITE_USER_ERROR", "INVITE_USER_ERROR", "An error has occurred! Please try again later.");
  } else {
    if (sendEmail(inviteData.invitedEmail, inviteData.companyName, inviteData.companyNumber, inviteData.inviterName)) {
      action = fr.Action.goTo(NodeOutcome.SUCCESS).build();
    } else {
      sendErrorCallbacks("INVITE_USER_ERROR", "INVITE_USER_ERROR", "An error occurred while sending the email. Please try again later.");
    }
  }
} catch (e) {
  logger.error("[COMPANY INVITE - SEND EMAIL] Error : " + e);
}