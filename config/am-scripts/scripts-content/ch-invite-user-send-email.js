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
    java.time.Clock,
    org.forgerock.secrets.SecretBuilder,
    javax.crypto.spec.SecretKeySpec,
    org.forgerock.secrets.keys.SigningKey,
    org.forgerock.json.jose.jws.handlers.SecretHmacSigningHandler
)

var NodeOutcome = {
    ERROR: "false",
    SUCCESS: "true"
}

// builds the Password Reset JWT
function buildOnboardingToken(email, companyNo) {
    var jwt;
    var signingHandler;
    var secret = transientState.get("secretKey");
    try {
        var secretbytes = java.lang.String(secret).getBytes();
        var secretBuilder = new fr.SecretBuilder;
        secretBuilder.secretKey(new javax.crypto.spec.SecretKeySpec(secretbytes, "Hmac"));
        secretBuilder.stableId(host).expiresIn(5, fr.ChronoUnit.MINUTES, fr.Clock.systemUTC());
        var key = new fr.SigningKey(secretBuilder);
        signingHandler = new fr.SecretHmacSigningHandler(key);
    } catch (e) {
        logger.error("[ONBOARIDNG] Error while creating signing handler: " + e);
        return false;
    }
    var jwtClaims = new fr.JwtClaimsSet;
    try {
        jwtClaims.setIssuer(host);
        var dateNow = new Date();
        jwtClaims.setIssuedAtTime(dateNow);
        jwtClaims.setSubject(email);
        if (company) {
            jwtClaims.setClaim("companyNo", companyNo);
        }
        jwtClaims.setClaim("creationDate", new Date().toString());
    } catch (e) {
        logger.error("[ONBOARIDNG] Error while adding claims to JWT: " + e);
        return false;
    }

    try {
        jwt = new fr.JwtBuilderFactory()
            .jws(signingHandler)
            .headers()
            .alg(fr.JwsAlgorithm.HS256)
            .done()
            .claims(jwtClaims)
            .build();
        logger.error("[ONBOARIDNG] Onboarding JWT: " + jwt);
        return jwt;
    } catch (e) {
        logger.error("[ONBOARIDNG] Error while creating JWT: " + e);
        return false;
    }
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

//raises a generic error
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
function sendEmail(onboardingJwt, invitedEmail, companyName, companyNumber, inviterName) {

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
    var onboardingJwt;
    var host = requestHeaders.get("origin").get(0);
    var request = new org.forgerock.http.protocol.Request();

    var inviteData = extractInviteDataFromState();

    if (!inviteData) {
        sendErrorCallbacks("INVITE_USER_ERROR", "INVITE_USER_ERROR", "An error has occurred! Please try again later.");
    } else {
        onboardingJwt = buildOnboardingToken(inviteData.invitedEmail, inviteData.companyNumber);
        if (!onboardingJwt) {
            sendErrorCallbacks("REGISTRATION_ERROR", "REGISTRATION_GENERAL_ERROR", "An error has occurred! Please try again later.");
        } else {
            if (sendEmail(onboardingJwt, inviteData.invitedEmail, inviteData.companyName, inviteData.companyNumber, inviteData.inviterName)) {
                action = fr.Action.goTo(NodeOutcome.SUCCESS).build();
            } else {
                sendErrorCallbacks("INVITE_USER_ERROR", "INVITE_USER_ERROR", "An error occurred while sending the email. Please try again later.");
            }
        }
    }
} catch (e) {
    logger.error("[COMPANY INVITE - SEND EMAIL] Error : " + e);
}