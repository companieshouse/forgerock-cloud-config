/* 
  ** INPUT DATA
    * SHARED STATE
     - 'objectAttributes.mail': the email address entered by the user in the password reset page
    * TRANSIENT STATE
      - 'secretKey': key to sing the JWT
      - 'notifyJWT': JWT to use for the Notify call
      - 'notifyTemplates': list of Notify templates available
       
  ** OUTCOMES
    - success: email sent correctly
    - error: general error while sending email
  
  ** CALLBACKS: 
    - output: email sending error
    - output: general error
*/

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
    SUCCESS: "true",
    ERROR: "false"
}

// function that builds the Password Reset JWT
function buildPasswordResetToken(email) {
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
        logger.error("[RESET PWD] Error while creating signing handler: " + e);
        return false;
    }

    var jwtClaims = new fr.JwtClaimsSet;
    try {
        jwtClaims.setIssuer(host);
        var dateNow = new Date();
        jwtClaims.setIssuedAtTime(dateNow);
        jwtClaims.setSubject(email);
        jwtClaims.setClaim("creationDate", new Date().toString());
    } catch (e) {
        logger.error("[RESET PWD] Error while adding claims to JWT: " + e);
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
        logger.error("[RESET PWD] JWT from reg: " + jwt);
    } catch (e) {
        logger.error("[RESET PWD] Error while creating JWT: " + e);
        return false;
    }
    return jwt;
}

//extracts the email address from shared state
function extractEmailFromState() {
    logger.error("[RESET PWD] host: " + host);
    logger.error("[RESET PWD] shared: " + sharedState.get("objectAttributes"));

    try {
        email = sharedState.get("objectAttributes").get("mail");
        logger.error("[RESET PWD] mail : " + email);
    } catch (e) {
        logger.error("[RESET PWD] error in fetching objectAttributes : " + e);
        return false;
    }
    return email;
}

//builds the URL which will be sent via email
function buildReturnUrl(jwt) {
    try {
        returnUrl = host.concat("/am/XUI/?realm=/alpha&service=CHResetPassword&token=", jwt)
        logger.error("[RESET PWD] URL: " + returnUrl);
        return returnUrl;
    } catch (e) {
        logger.error("[RESET PWD] Error while extracting host: " + e);
        return false;
    }
}

// raise the generic error callbacks
function raiseGeneralError() {
    if (callbacks.isEmpty()) {
        action = fr.Action.send(
            new fr.HiddenValueCallback(
                "stage",
                "RESET_PASSWORD_ERROR"
            ),
            new fr.TextOutputCallback(
                fr.TextOutputCallback.ERROR,
                "An error has occurred! Please try again later"
            ),
            new fr.HiddenValueCallback(
                "pagePropsJSON",
                JSON.stringify({ 'errors': [{ label: "An error has occurred while resetting the password. Please try again later.", token: "RESET_PASSWORD_GENERAL_ERROR" }] })
            )
        ).build()
    }
}

// raise the email send error callbacks
function raiseEmailSendError() {
    if (callbacks.isEmpty()) {
        action = fr.Action.send(
            new fr.HiddenValueCallback(
                "stage",
                "RESET_PASSWORD_ERROR"
            ),
            new fr.TextOutputCallback(
                fr.TextOutputCallback.ERROR,
                "An error occurred while sending the email. Please try again."
            ),
            new fr.HiddenValueCallback(
                "pagePropsJSON",
                JSON.stringify({ 'errors': [{ label: "An error occurred while sending the email. Please try again.", token: "RESET_PASSWORD_EMAIL_SEND_ERROR" }] })
            )
        ).build()
    }
}

//send the email
function sendEmail() {
    var notifyJWT = transientState.get("notifyJWT");
    var templates = transientState.get("notifyTemplates");
    var language = 'EN';
    logger.error("[RESET PWD] Notify JWT from transient state: " + notifyJWT);
    logger.error("[RESET PWD] Templates from transient state: " + templates);
    var isUserExisting = transientState.get("isUserExisting");
    request.setUri("https://api.notifications.service.gov.uk/v2/notifications/email");
    try {
        var requestBodyJson = isUserExisting ? {
            "email_address": email,
            "template_id": language === 'EN' ? JSON.parse(templates).en_existingUser : JSON.parse(templates).cy_existingUser,
            "personalisation": {
                "link": returnUrl,
                "email": email
            }
        } :
            {
                "email_address": email,
                "template_id": language === 'EN' ? JSON.parse(templates).en_resetPwd : JSON.parse(templates).cy_resetPwd,
                "personalisation": {
                    "link": returnUrl
                }
            };

    } catch (e) {
        logger.error("[RESET PWD] Error while preparing request for Notify: " + e);
        return false;
    }

    request.setMethod("POST");
    request.getHeaders().add("Content-Type", "application/json");
    request.getHeaders().add("Authorization", "Bearer " + notifyJWT);
    request.getEntity().setString(JSON.stringify(requestBodyJson))

    var response = httpClient.send(request).get();
    var notificationId;
    logger.error("[RESET PWD] Response: " + response.getStatus().getCode() + " - " + response.getCause() + " - " + response.getEntity().getString());

    try {
        notificationId = JSON.parse(response.getEntity().getString()).id;
        transientState.put("notificationId", notificationId);
        logger.error("[RESET PWD] Notify ID: " + notificationId);
    } catch (e) {
        logger.error("[RESET PWD] Error while parsing Notify response: " + e);
        return false;
    }

    return (response.getStatus().getCode() == 201);
}

// main execution flow

var request = new org.forgerock.http.protocol.Request();
var host = requestHeaders.get("origin").get(0);
var resetPasswordjJwt;
var returnUrl;

var email = extractEmailFromState();
if (email) {
    resetPasswordjJwt = buildPasswordResetToken(email);
    if (resetPasswordjJwt) {
        returnUrl = buildReturnUrl(resetPasswordjJwt);
    }
}

if (!email || !resetPasswordjJwt || !returnUrl) {
    raiseGeneralError();
} else {
    if (sendEmail()) {
        action = fr.Action.goTo(NodeOutcome.SUCCESS).build();
    } else {
        raiseEmailSendError();
    }
}

//always return false at the end, because we don't end up with a session
outcome = NodeOutcome.ERROR;