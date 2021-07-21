/* 
  ** INPUT DATA
    * SHARED STATE:
      - 'objectAttributes.telephoneNumber': the user telephone number (entered in a previous screen)
      - 'objectAttributes.givenName': the user full name (entered in a previous screen)
      - 'objectAttributes.mail': the user email (entered in a previous screen)

    * TRANSIENT STATE
      - 'notifyJWT': the Notify JWT to be used for requests to Notify
      - 'templates': the list of all Notify templates 

  ** OUTPUT DATA
    * TRANSIENT STATE:
      - 'notificationId': the notification ID returned by Notify if the call was successful
    
  ** OUTCOMES
    - true: message sent successfully
  
  ** CALLBACKS:
    - error while sending (SEND_MFA_SMS_ERROR)
    - generic error (REGISTRATION_ERROR)
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
    org.forgerock.json.jose.jwe.JweAlgorithm,
    org.forgerock.json.jose.jwe.EncryptionMethod,
    org.forgerock.secrets.SecretBuilder,
    org.forgerock.json.jose.jws.SignedJwt,
    org.forgerock.json.jose.jws.EncryptedThenSignedJwt,
    org.forgerock.json.jose.jwe.SignedThenEncryptedJwt,
    javax.crypto.spec.SecretKeySpec,
    org.forgerock.secrets.keys.SigningKey,
    org.forgerock.secrets.keys.VerificationKey,
    org.forgerock.json.jose.jws.handlers.SecretHmacSigningHandler,
    org.forgerock.util.encode.Base64,
    java.time.temporal.ChronoUnit,
    java.time.Clock
)

var NodeOutcome = {
    ERROR: "false",
    SUCCESS: "true"
}

var KeyType = {
    SIGNING: 0,
    VERIFICATION: 1,
    ENCRYPTION: 2
}

var JwtType = {
    SIGNED: 0,
    ENCRYPTED: 1,
    SIGNED_THEN_ENCRYPTED: 2,
    ENCRYPTED_THEN_SIGNED: 3
}

function getKey(secret, keyType) {
    if (keyType == KeyType.ENCRYPTION) {
        return new fr.SecretKeySpec(fr.Base64.decode(config.encryptionKey), "AES")
    }
    else {
        var secretBytes = fr.Base64.decode(secret);
        var secretBuilder = new fr.SecretBuilder;
        secretBuilder.secretKey(new javax.crypto.spec.SecretKeySpec(secretBytes, "Hmac"));
        secretBuilder.stableId(config.issuer).expiresIn(5, fr.ChronoUnit.MINUTES, fr.Clock.systemUTC());
        return (keyType == KeyType.SIGNING) ? new fr.SigningKey(secretBuilder) : new fr.VerificationKey(secretBuilder)
    }
}

// extracts the email from shared state
function extractRegDataFromState() {
    try {
        email = sharedState.get("objectAttributes").get("mail");
        fullName = sharedState.get("objectAttributes").get("givenName");
        phone = sharedState.get("objectAttributes").get("telephoneNumber");
        logger.error("mail : " + email + " - name: " + fullName + " - phone: " + phone);
        return { email: email, phone: phone, fullName: fullName }
    } catch (e) {
        logger.error("[REGISTRATION - SEND EMAIL] error in fetching objectAttributes : " + e);
        return false;
    }
}

function buildJwt(claims, issuer, audience, jwtType) {

    logger.message("Building response JWT")

    var signingKey = getKey(config.signingKey, KeyType.SIGNING)
    var signingHandler = new fr.SecretHmacSigningHandler(signingKey);
    var encryptionKey = getKey(config.encryptionKey, KeyType.ENCRYPTION)

    var iat = new Date()
    var iatTime = iat.getTime();

    var jwtClaims = new fr.JwtClaimsSet
    jwtClaims.setIssuer(issuer)
    jwtClaims.addAudience(audience);
    jwtClaims.setIssuedAtTime(new Date());
    jwtClaims.setExpirationTime(new Date(iatTime + (config.validityMinutes * 60 * 1000)))
    jwtClaims.setClaims(claims)

    var jwt = null;

    switch (jwtType) {

        case JwtType.SIGNED:

            jwt = new fr.JwtBuilderFactory()
                .jws(signingHandler)
                .headers()
                .alg(fr.JwsAlgorithm.HS256)
                .done()
                .claims(jwtClaims)
                .build();
            break;

        case JwtType.SIGNED_THEN_ENCRYPTED:

            jwt = new fr.JwtBuilderFactory()
                .jws(signingHandler)
                .headers()
                .alg(fr.JwsAlgorithm.HS256)
                .done()
                .encrypt(encryptionKey)
                .headers()
                .alg(fr.JweAlgorithm.DIRECT)
                .enc(fr.EncryptionMethod.A128CBC_HS256)
                .done()
                .claims(jwtClaims)
                .build();
            break;

        case JwtType.ENCRYPTED_THEN_SIGNED:

            jwt = new fr.JwtBuilderFactory()
                .jwe(encryptionKey)
                .headers()
                .alg(fr.JweAlgorithm.DIRECT)
                .enc(fr.EncryptionMethod.A128CBC_HS256)
                .done()
                .claims(jwtClaims)
                .signedWith(signingHandler, fr.JwsAlgorithm.HS256)
                .build();
            break;

        default:
            logger.error("Unknown jwt type " + jwtType)

    }

    return jwt;
}

// builds the Password Reset JWT
// function buildRegistrationToken(email, phone, fullName) {
//     var jwt;
//     var signingHandler;
//     var secret = transientState.get("secretKey");
//     try {
//         var secretbytes = java.lang.String(secret).getBytes();
//         var secretBuilder = new fr.SecretBuilder;
//         secretBuilder.secretKey(new javax.crypto.spec.SecretKeySpec(secretbytes, "Hmac"));
//         secretBuilder.stableId(host).expiresIn(5, fr.ChronoUnit.MINUTES, fr.Clock.systemUTC());
//         var key = new fr.SigningKey(secretBuilder);
//         signingHandler = new fr.SecretHmacSigningHandler(key);
//     } catch (e) {
//         logger.error("[REGISTRATION - SEND EMAIL] Error while creating signing handler: " + e);
//         return false;
//     }
//     var jwtClaims = new fr.JwtClaimsSet;
//     try {
//         jwtClaims.setIssuer(host);
//         var dateNow = new Date();
//         jwtClaims.setIssuedAtTime(dateNow);
//         jwtClaims.setSubject(email);
//         if (fullName) {
//             jwtClaims.setClaim("fullName", fullName);
//         }
//         if (phone) {
//             jwtClaims.setClaim("phone", phone);
//         }
//         jwtClaims.setClaim("creationDate", new Date().toString());
//     } catch (e) {
//         logger.error("[REGISTRATION - SEND EMAIL] Error while adding claims to JWT: " + e);
//         return false;
//     }

//     try {
//         jwt = new fr.JwtBuilderFactory()
//             .jws(signingHandler)
//             .headers()
//             .alg(fr.JwsAlgorithm.HS256)
//             .done()
//             .claims(jwtClaims)
//             .build();
//         logger.error("[REGISTRATION - SEND EMAIL] JWT from reg: " + jwt);
//         return jwt;
//     } catch (e) {
//         logger.error("[REGISTRATION - SEND EMAIL] Error while creating JWT: " + e);
//         return false;
//     }
// }

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

//sends the email (via Notify) to the recipient using the given registration JWT
function sendEmail(language, jwt) {

    var notifyJWT = transientState.get("notifyJWT");
    var templates = transientState.get("notifyTemplates");
    var returnUrl = host.concat("/am/XUI/?realm=/alpha&&service=CHVerifyReg&token=", jwt)
    logger.error("[REGISTRATION - SEND EMAIL] JWT from transient state: " + notifyJWT);
    logger.error("[REGISTRATION - SEND EMAIL] Templates from transient state: " + templates);
    logger.error("[REGISTRATION - SEND EMAIL] RETURN URL: " + returnUrl);

    request.setUri("https://api.notifications.service.gov.uk/v2/notifications/email");
    try {
        var requestBodyJson = {
            "email_address": email,
            "template_id": language === 'EN' ? JSON.parse(templates).en_verifyReg : JSON.parse(templates).cy_verifyReg,
            "personalisation": {
                "link": returnUrl
            }
        }
    } catch (e) {
        logger.error("[REGISTRATION - SEND EMAIL] Error while preparing request for Notify: " + e);
        return false;
    }

    request.setMethod("POST");
    request.getHeaders().add("Content-Type", "application/json");
    request.getHeaders().add("Authorization", "Bearer " + notifyJWT);
    request.getEntity().setString(JSON.stringify(requestBodyJson));

    var response = httpClient.send(request).get();
    var notificationId;
    logger.error("[REGISTRATION - SEND EMAIL] Notify Response: " + response.getStatus().getCode() + " - " + response.getEntity().getString());

    try {
        notificationId = JSON.parse(response.getEntity().getString()).id;
        transientState.put("notificationId", notificationId);
        logger.error("[REGISTRATION - SEND EMAIL] Notify ID: " + notificationId);
    } catch (e) {
        logger.error("[REGISTRATION - SEND EMAIL] Error while parsing Notify response: " + e);
        return false;
    }

    return (response.getStatus().getCode() == 201);
}

//extracts the language form headers (default to EN)
function getSelectedLanguage(requestHeaders) {
    if (requestHeaders && requestHeaders.get("Chosen-Language")) {
        var lang = requestHeaders.get("Chosen-Language").get(0);
        logger.error("[REGISTRATION - SEND EMAIL] selected language: " + lang);
        return lang;
    }
    logger.error("[REGISTRATION - SEND EMAIL] no selected language found - defaulting to EN");
    return 'EN';
}


function getClaims() {
    var jwtClaims = new fr.JwtClaimsSet;
    try {
        jwtClaims.setIssuer(host);
        var dateNow = new Date();
        jwtClaims.setIssuedAtTime(dateNow);
        jwtClaims.setSubject(email);
        if (fullName) {
            jwtClaims.setClaim("fullName", fullName);
        }
        if (phone) {
            jwtClaims.setClaim("phone", phone);
        }
        jwtClaims.setClaim("creationDate", new Date().toString());
    } catch (e) {
        logger.error("[REGISTRATION - SEND EMAIL] Error while adding claims to JWT: " + e);
        return false;
    }
}

// main execution flow
var config = {
    signingKey: transientState.get("chJwtSigningKey"),
    encryptionKey: transientState.get("chJwtEncryptionKey"),
    issuer: requestHeaders.get("origin").get(0),
    audience: "CH Account",
    validityMinutes: 1440
}

try {
    var returnUrl;
    var registrationJwt;
    var host = requestHeaders.get("origin").get(0);
    var request = new org.forgerock.http.protocol.Request();
    var language = getSelectedLanguage(requestHeaders);
    var now = new Date();

    var regData = extractRegDataFromState();
    var registrationClaims = {
        subject: regData.email,
        fullName: regData.fullName,
        phone: regData.phone,
        creationDate: now.toString(),
        expirationDate: new Date(now.getTime() + config.validityMinutes * 60 * 1000).toString()
    }

    if (regData) {
        // registrationJwt = buildRegistrationToken(regData.email, regData.phone, regData.fullName);
        registrationJwt = buildJwt(registrationClaims, config.issuer, config.audience, JwtType.SIGNED_THEN_ENCRYPTED);
        action = fr.Action.send(
            new fr.TextOutputCallback(
                fr.TextOutputCallback.ERROR,
                registrationJwt
            )
        ).build()
    }

    if (!regData || !registrationJwt) {
        sendErrorCallbacks("REGISTRATION_ERROR", "REGISTRATION_GENERAL_ERROR", "An error has occurred! Please try again later.");
    } else {
        if (sendEmail(language, registrationJwt)) {
            action = fr.Action.goTo(NodeOutcome.SUCCESS).build();
        } else {
            sendErrorCallbacks("REGISTRATION_ERROR", "REGISTRATION_SEND_EMAIL_ERROR", "An error occurred while sending the email. Please try again later.");
        }
    }
} catch (e) {
    logger.error("[REGISTRATION - SEND EMAIL] ERROR " + e);
    action = fr.Action.send(
        new fr.TextOutputCallback(
            fr.TextOutputCallback.ERROR,
            e.toString()
        )
    ).build()
}