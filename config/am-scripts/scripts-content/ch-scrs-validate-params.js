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
    org.forgerock.json.jose.jws.SignedJwt,
    org.forgerock.json.jose.jws.EncryptedThenSignedJwt,
    org.forgerock.json.jose.jwe.SignedThenEncryptedJwt,
    org.forgerock.json.jose.jws.handlers.SecretHmacSigningHandler,
    javax.crypto.spec.SecretKeySpec,
    org.forgerock.secrets.SecretBuilder,
    org.forgerock.secrets.keys.SigningKey,
    org.forgerock.secrets.keys.VerificationKey,
    org.forgerock.util.encode.Base64,
    java.time.temporal.ChronoUnit,
    java.time.Clock
)

var NodeOutcome = {
    ERROR: "false",
    SUCCESS: "true"
}


//raises a generic error
function sendErrorCallbacks(message) {
    if (callbacks.isEmpty()) {
        action = fr.Action.send(
            new fr.TextOutputCallback(
                fr.TextOutputCallback.ERROR,
                message
            )
        ).build()
    }
}

//extracts the language form headers (default to EN)
function getHeaderParams(requestHeaders) {
    var username, pwd, link, email, companyName, companyNumber, newUser;
    if(!requestHeaders){
        return {
            success: false,
            message: "no headers"
        };
    }
    if (requestHeaders.get("ch-username")) {
        username = requestHeaders.get("ch-username").get(0);
    }
    if (requestHeaders.get("ch-password")) {
        pwd = requestHeaders.get("ch-password").get(0);
    }
    if (requestHeaders.get("notification-link")) {
        link = requestHeaders.get("notification-link").get(0);
    }
    if (requestHeaders.get("notification-email")) {
        email = requestHeaders.get("notification-email").get(0);
    }
    if (requestHeaders.get("new-user")) {
        newUser = requestHeaders.get("new-user").get(0);
    }
    if (requestHeaders.get("notification-company-name")) {
        companyName = requestHeaders.get("notification-company-name").get(0);
    }
    if (requestHeaders.get("notification-company-number")) {
        companyNumber = requestHeaders.get("notification-company-number").get(0);
    }

    if ((!username || !username.equals("tree-service-user@companieshouse.com")) || !pwd || !link || !email || !companyName || !companyNumber) {
        return {
            success: false,
            message: String(requestHeaders) + " --- " + username + " " + pwd + " " + link + " " + email + " " + companyName + " " + companyNumber 
            //String(requestHeaders)
        };
    }
    logger.error("[SCRS - HEADERS] " + String(requestHeaders) + " --- " + username + " " + pwd + " " + link + " " + email + " " + companyName + " " + companyNumber);
    return {
        success: true,
        data: {
            username: username,
            password: pwd,
            link: link,
            email: email,
            companyName: companyName,
            companyNumber: companyNumber,
            newUser: newUser
        }
    };
}

var FIDC_ENDPOINT = "https://openam-companieshouse-uk-dev.id.forgerock.io";

// main execution flow

try {
    var request = new org.forgerock.http.protocol.Request();
    var paramsObj = getHeaderParams(requestHeaders);
    if (!paramsObj.success) {
        sharedState.put("errorMessage", "SCRS - Error in validating parameters - " + paramsObj.message);
        outcome = NodeOutcome.ERROR;
    } else {
        sharedState.put("username", paramsObj.data.username);
        sharedState.put("password", paramsObj.data.password);
        sharedState.put("scrsEmail", paramsObj.data.email);
        sharedState.put("scrsLink", paramsObj.data.link);
        sharedState.put("scrsCompanyName", paramsObj.data.companyName);
        sharedState.put("scrsCompanyNumber", paramsObj.data.companyNumber);
        sharedState.put("scrsNewUser", paramsObj.data.newUser);
        outcome = NodeOutcome.SUCCESS;
    }
} catch (e) {
    logger.error("[SCRS - CHECK PARAMS] Error : " + e);
    sharedState.put("errorMessage", e.toString());
    outcome = NodeOutcome.ERROR;
}