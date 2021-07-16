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
    org.forgerock.json.jose.jws.handlers.SecretHmacSigningHandler,
    org.forgerock.json.jose.builders.JwtBuilderFactory,
    org.forgerock.json.jose.jwt.JwtClaimsSet,
    org.forgerock.json.jose.jws.JwsAlgorithm
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
        return {
            success: false,
            message: "[ONBOARIDNG] Error while creating signing handler: ".concat(e)
        };
    }
    var jwtClaims = new fr.JwtClaimsSet;
    try {
        jwtClaims.setIssuer(host);
        var dateNow = new Date();
        jwtClaims.setIssuedAtTime(dateNow);
        jwtClaims.setSubject(email);
        if (companyNo) {
            jwtClaims.setClaim("companyNo", companyNo);
        }
        jwtClaims.setClaim("creationDate", new Date().toString());
    } catch (e) {
        logger.error("[ONBOARIDNG] Error while adding claims to JWT: " + e);
        return {
            success: false,
            message: "[ONBOARIDNG] Error while adding claims to JWT: ".concat(e)
        };
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
        return {
            success: true,
            token: jwt
        };
    } catch (e) {
        logger.error("[ONBOARIDNG] Error while creating JWT: " + e);
        return {
            success: false,
            message: "[ONBOARIDNG] Error while creating JWT: ".concat(e)
        };
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
function sendEmail(language, invitedEmail, companyName, companyNumber, inviterName) {
    var onboardingJwtResponse = "";
    var returnUrl = "";
    //if the user has been onboarded, the link they receive must be to the onboarding journey
    if (isOnboarding) {
        onboardingJwtResponse = buildOnboardingToken(invitedEmail, companyNumber);
        if (!onboardingJwtResponse.success) {
            logger.error("[COMPANY INVITE - SEND EMAIL] Error while creating Onboarding JWT");
            return {
                success: false,
                message: onboardingJwtResponse.message
            };
        } else {
            returnUrl = host.concat("/account/onboarding/?token=", onboardingJwtResponse.token)
                            .concat("&goto=", encodeURIComponent("/account/notifications/#" + companyNumber));
        }
    } else {
        returnUrl = host.concat("/account/login/?goto=", encodeURIComponent("/account/notifications/#" + companyNumber));
    }

    logger.error("[COMPANY INVITE - SEND EMAIL] params: " + invitedEmail + " - " + companyName + " - " + inviterName);

    var notifyJWT = transientState.get("notifyJWT");
    var templates = transientState.get("notifyTemplates");
    
    logger.error("[COMPANY INVITE - SEND EMAIL] JWT from transient state: " + notifyJWT);
    logger.error("[COMPANY INVITE - SEND EMAIL] Templates from transient state: " + templates);
    logger.error("[COMPANY INVITE - SEND EMAIL] RETURN URL: " + returnUrl);

    request.setUri("https://api.notifications.service.gov.uk/v2/notifications/email");
    try {
        var requestBodyJson = {
            "email_address": invitedEmail,
            "template_id": language === 'EN' ? JSON.parse(templates).en_invite : JSON.parse(templates).cy_invite,
            "personalisation": {
                "link": returnUrl,
                "company": companyName,
                "inviter": inviterName
            }
        }
    } catch (e) {
        logger.error("[COMPANY INVITE - SEND EMAIL] Error while preparing request for Notify: " + e);
        return {
            success: false,
            message: "[COMPANY INVITE - SEND EMAIL] Error while preparing request for Notify: ".concat(e)
        };
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
        return {
            success: false,
            message: "[COMPANY INVITE - SEND EMAIL] Error while parsing Notify response: ".concat(e)
        };
    }

    return {
        success: (response.getStatus().getCode() == 201),
        message: (response.getStatus().getCode() == 201) ? ("Message sent") : ("Cannot send message: " + response.getStatus().getCode())
    };
}

//extracts the language form headers (default to EN)
function getSelectedLanguage(requestHeaders) {
    if (requestHeaders && requestHeaders.get("Chosen-Language")) {
        var lang = requestHeaders.get("Chosen-Language").get(0);
        logger.error("[COMPANY INVITE - SEND EMAIL] selected language: " + lang);
        return lang;
    }
    logger.error("[COMPANY INVITE - SEND EMAIL] no selected language found - defaulting to EN");
    return 'EN';
}

// main execution flow
try {
    var host = requestHeaders.get("origin").get(0);
    var request = new org.forgerock.http.protocol.Request();
    var isOnboarding = sharedState.get("isOnboarding");
    var inviteData = extractInviteDataFromState();
    var language = getSelectedLanguage(requestHeaders);

    if (!inviteData) {
        sendErrorCallbacks("INVITE_USER_ERROR", "INVITE_USER_ERROR", "An error has occurred! Please try again later.");
    } else {
        var sendEmailResult = sendEmail(language, inviteData.invitedEmail, inviteData.companyName, inviteData.companyNumber, inviteData.inviterName);
        if (sendEmailResult.success) {
            action = fr.Action.goTo(NodeOutcome.SUCCESS).build();
        } else {
            sendErrorCallbacks("INVITE_USER_ERROR", "INVITE_USER_ERROR", JSON.stringify(sendEmailResult));
        }
    }
} catch (e) {
    logger.error("[COMPANY INVITE - SEND EMAIL] Error : " + e);
    sendErrorCallbacks("INVITE_USER_ERROR", "INVITE_USER_ERROR", e);
}