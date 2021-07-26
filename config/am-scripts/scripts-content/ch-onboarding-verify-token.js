var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    java.lang.Math,
    java.lang.String,
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
    org.forgerock.secrets.SecretBuilder,
    javax.crypto.spec.SecretKeySpec,
    org.forgerock.secrets.keys.SigningKey,
    org.forgerock.secrets.keys.VerificationKey,
    org.forgerock.json.jose.jws.handlers.SecretHmacSigningHandler,
    org.forgerock.util.encode.Base64,
    java.time.temporal.ChronoUnit,
    java.time.Clock
)

var NodeOutcome = {
    SUCCESS: "true",
    ERROR: "false"
}

var MembershipStatus = {
    CONFIRMED: "confirmed",
    PENDING: "pending",
    NONE: "none"
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

var FIDC_ENDPOINT = "https://openam-companieshouse-uk-dev.id.forgerock.io";

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

function validatedJwtClaims(jwtString, issuer, jwtType) {

    var jwt = null
    var verificationKey = getKey(config.signingKey, KeyType.VERIFICATION)
    var decryptionKey = getKey(config.encryptionKey, KeyType.ENCRYPTION)

    switch (jwtType) {
        case JwtType.SIGNED:
            jwt = new fr.JwtBuilderFactory().reconstruct(jwtString, fr.SignedJwt);
            break;


        case JwtType.ENCRYPTED_THEN_SIGNED:
            jwt = new fr.JwtBuilderFactory().reconstruct(jwtString, fr.EncryptedThenSignedJwt);
            jwt.decrypt(decryptionKey)
            break;

        case JwtType.SIGNED_THEN_ENCRYPTED:
            jwt = new fr.JwtBuilderFactory().reconstruct(jwtString, fr.SignedThenEncryptedJwt);
            jwt.decrypt(decryptionKey)
            break;

        default:
            logger.error("Unknown jwt type " + jwtType)
            return {
                success: false,
                code: "ERROR_JWT_TYPE_UNKNOWN",
                message: "Unknown jwt type " + jwtType
            }
    }

    var verificationHandler = new fr.SecretHmacSigningHandler(verificationKey)

    if (!jwt.verify(verificationHandler)) {
        logger.message("JWT signature did not verify")
        return {
            success: false,
            code: "ERROR_TOKEN_VERIFICATION",
            message: "JWT signature did not verify"
        }
    }

    var jwtClaims = jwt.getClaimsSet()
    var jwtIssuer = jwtClaims.getIssuer()
    var jwtIssuedAt = jwtClaims.getIssuedAtTime()
    var jwtExpiry = jwtClaims.getExpirationTime()
    var now = new Date()

    if (jwtIssuer != issuer) {
        logger.message("Issuer in JWT [" + jwtIssuer + "] doesn't match expected issuer [" + issuer + "]")
        return {
            success: false,
            code: "ERROR_TOKEN_ISSUER_MISMATCH",
            message: "Issuer in JWT [" + jwtIssuer + "] doesn't match expected issuer [" + issuer + "]"
        }
    }

    if (jwtIssuedAt.after(now)) {
        logger.message("JWT issued in the future [" + jwtIssuedAt + "]")
        return {
            success: false,
            code: "ERROR_TOKEN_ISSUED_IN_FUTURE",
            message: "JWT issued in the future [" + jwtIssuedAt + "]"
        }
    }

    if (jwtExpiry.before(now)) {
        logger.message("JWT expired at [" + jwtExpiry + "]")
        return {
            success: false,
            code: "ERROR_TOKEN_EXPIRED",
            message: "JWT expired at [" + jwtExpiry + "]"
        }
    }

    return {
        success: true,
        claims: jwtClaims.build()
    };
}

function extractTokenParameter() {
    var tokenURLParam = requestParameters.get("token");
    if (!tokenURLParam) {
        if (callbacks.isEmpty()) {
            action = fr.Action.send(
                new fr.HiddenValueCallback(
                    "stage",
                    "ONBOARDING_ERROR"
                ),
                new fr.HiddenValueCallback(
                    "pagePropsJSON",
                    JSON.stringify({ "error": "No Onboarding Token found in request.", "token": "ONBOARDING_NO_TOKEN_ERROR" })
                ),
                new fr.TextOutputCallback(
                    fr.TextOutputCallback.ERROR,
                    "Token parameter not found"
                )
            ).build();
            return false;
        }
    } else {
        return tokenURLParam.get(0);
    }
}

//fetches the IDM access token from transient state
function fetchIDMToken() {
    var ACCESS_TOKEN_STATE_FIELD = "idmAccessToken";
    var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);
    if (accessToken === null) {
        logger.error("[ONBOARDING-RESUME] Access token not in transient state")
        return false;
    }
    return accessToken;
}

//checks whether the user with the given email already exists in IDM
function lookupUser(email) {
    try {
        var idmUserEndpoint = FIDC_ENDPOINT + "/openidm/managed/alpha_user?_queryFilter=userName+eq+%22" + email + "%22";
        var request = new org.forgerock.http.protocol.Request();
        var accessToken = fetchIDMToken();
        if (!accessToken) {
            logger.error("[ONBOARDING-RESUME - CHECK MEMBERSHIP] Access token not in transient state");
            return {
                success: false,
                error: "Access token not in transient state"
            }
        }

        request.setMethod('GET');
        request.setUri(idmUserEndpoint);
        request.getHeaders().add("Authorization", "Bearer " + accessToken);
        request.getHeaders().add("Content-Type", "application/json");
        request.getHeaders().add("Accept-API-Version", "resource=1.0");

        var response = httpClient.send(request).get();

        if (response.getStatus().getCode() === 200) {
            var searchResponse = JSON.parse(response.getEntity().getString());
            if (searchResponse && searchResponse.result && searchResponse.result.length > 0) {
                logger.error("[ONBOARDING-RESUME] user found: " + searchResponse.result[0].toString());
                return {
                    success: true,
                    user: searchResponse.result[0]
                }
            } else {
                logger.error("[ONBOARDING-RESUME] user NOT found: " + email);
                return {
                    success: true,
                    user: null
                }
            }
        } else {
            logger.error("[ONBOARDING-RESUME] Error while looking up user: " + response.getStatus().getCode())
            return {
                success: false,
                error: "Error while looking up user: " + response.getStatus().getCode()
            }
        }
    } catch (e) {
        logger.error(e)
        return {
            success: false,
            error: "Error while checking user existence: " + e.toString()
        }
    }
}

// extracts the user membership status to the given company. User could be provided as a user ID or a username (email) 
function isUserInvitedForCompany(userEmail, companyNo) {
    var request = new org.forgerock.http.protocol.Request();
    var accessToken = transientState.get("idmAccessToken");
    var idmCompanyAuthEndpoint = FIDC_ENDPOINT + "/openidm/endpoint/companyauth?_action=getCompanyStatusByUsername";
    if (accessToken === null) {
        logger.error("[ONBOARDING-RESUME - CHECK MEMBERSHIP] Access token not in transient state");
        return {
            success: false,
            error: "Access token not in transient state"
        }
    }

    var requestBodyJson = {
        "subjectUserName": userEmail,
        "companyNumber": companyNo
    };

    request.setMethod('POST');
    logger.error("[ONBOARDING-RESUME - CHECK MEMBERSHIP] Check user " + userEmail + " membership status to company " + companyNo);
    request.setUri(idmCompanyAuthEndpoint);
    request.getHeaders().add("Authorization", "Bearer " + accessToken);
    request.getHeaders().add("Content-Type", "application/json");
    request.getHeaders().add("Accept-API-Version", "resource=1.0");
    request.setEntity(requestBodyJson);

    var response = httpClient.send(request).get();

    if (response.getStatus().getCode() === 200) {
        logger.error("[ONBOARDING-RESUME - CHECK MEMBERSHIP] 200 response from IDM");
        var membershipResponse = JSON.parse(response.getEntity().getString());
        return {
            success: true,
            isPending: (membershipResponse.company.status === MembershipStatus.PENDING)
        }
    } else {
        logger.error("[ONBOARDING-RESUME - CHECK MEMBERSHIP] Error during relationship check");
        return {
            success: false,
            error: "Error during relationship check - " + response.getStatus().getCode()
        }
    }
}

function extractInfoFromToken(claimSet) {
    try {
        var email = claimSet.subject;
        var companyNo = claimSet.companyNo;
        logger.error("[ONBOARDING-RESUME] initiating email: " + email + " - companyNo: " + companyNo);
        return {
            email: email,
            companyNo: companyNo
        }
    } catch (e) {
        logger.error("[ONBOARDING-RESUME] error while reconstructing JWT: " + e);
        return false;
    }
}

function raiseError(message, token) {
    if (callbacks.isEmpty()) {
        action = fr.Action.send(
            new fr.HiddenValueCallback(
                "stage",
                "ONBOARDING_ERROR"
            ),
            new fr.HiddenValueCallback(
                "pagePropsJSON",
                JSON.stringify({ "error": message, "token": token })
            ),
            new fr.TextOutputCallback(
                fr.TextOutputCallback.ERROR,
                message
            )
        ).build()
    }
}

function saveUserDataToState(tokenData) {
    logger.error("[ONBOARDING-RESUME] The provided token is still valid");
    try {
        // put the read attributes in shared state for the Create Object node to consume
        sharedState.put("objectAttributes",
            {
                "userName": tokenData.email,
                "sn": tokenData.email,
                "mail": tokenData.email
            });
        sharedState.put("userName", tokenData.email);
        return NodeOutcome.SUCCESS;
    } catch (e) {
        logger.error("[ONBOARDING-RESUME] error while storing state: " + e);
        return NodeOutcome.ERROR;
    }
}

// reads the onboarding date
function validateOnboardingDate(user) {
    var onboardDate = user.frIndexedDate2;
    logger.error("[ONBOARDING-RESUME] onboarding date: " + onboardDate);

    if (onboardDate.length > 0) {
        var year = onboardDate.substring(0, 4);
        var month = onboardDate.substring(4, 6);
        var offsetMonth = parseInt(month) - 1;
        var day = onboardDate.substring(6, 8);
        var hour = onboardDate.substring(8, 10);
        var min = onboardDate.substring(10, 12);
        var sec = onboardDate.substring(12, 14);

        var lastLoginDateUTC = Date.UTC(year, offsetMonth, day, hour, min, sec);

        var now = new Date();

        var intervalDays = 7;
        var intervalInMillis = intervalDays * 86400 * 1000;

        var delta = now.getTime() - lastLoginDateUTC; // Difference in ms
        if (delta > intervalInMillis) {
            logger.error("[ONBOARDING-RESUME] Onboarding date is older than " + intervalDays + " days");
            return false;
        } else {
            logger.error("[ONBOARDING-RESUME] Onboarding date valid");
            return true;
        }
    }
}

//main execution flow
try {
    var config = {
        signingKey: transientState.get("chJwtSigningKey"),
        encryptionKey: transientState.get("chJwtEncryptionKey"),
        issuer: FIDC_ENDPOINT,
        audience: "CH Account"
    }
    if (typeof existingSession !== 'undefined') {
        if (callbacks.isEmpty()) {
            action = fr.Action.send(
                new fr.HiddenValueCallback(
                    "stage",
                    "ONBOARDING_ERROR"
                ),
                new fr.TextOutputCallback(
                    fr.TextOutputCallback.ERROR,
                    "An active session was found - You must terminate all active sessions to proceed with this operation"
                ),
                new fr.HiddenValueCallback(
                    "pagePropsJSON",
                    JSON.stringify({ 'errors': [
                        { 
                            label: "An active session was found - You must terminate all active sessions to proceed with this operation", 
                            token: "ACTIVE_SESSION_ERROR" 
                        }] 
                    })
                )
            ).build()
        }
    } else {
        var token = extractTokenParameter();
        sharedState.put("isOnboarding", true);
        if (token) {
            //var tokenData = extractInfoFromToken(token);
            var tokenClaimsResponse = validatedJwtClaims(token, config.issuer, JwtType.SIGNED_THEN_ENCRYPTED);
            if (!tokenClaimsResponse.success) {
                if (callbacks.isEmpty()) {
                    action = fr.Action.send(
                        new fr.TextOutputCallback(
                            fr.TextOutputCallback.ERROR,
                            "Error while processing token:".concat(tokenClaimsResponse.message)
                        ),
                        new fr.HiddenValueCallback(
                            "stage",
                            "ONBOARDING_ERROR"
                        ),
                        new fr.HiddenValueCallback(
                            "pagePropsJSON",
                            JSON.stringify(
                                {
                                    "error": "An error occurred while parsing the onboarding token.",
                                    "token": "ONBOARDING_".concat(tokenClaimsResponse.code)
                                })
                        )
                    ).build()
                }
            } else {
                var tokenData = extractInfoFromToken(JSON.parse(tokenClaimsResponse.claims));

                var userResponse = lookupUser(tokenData.email);

                if (!userResponse.success) {
                    raiseError(userResponse.error, "ONBOARDING_USER_LOOKUP_ERROR");
                } else if (!userResponse.user) {
                    raiseError("The invited user does not exist.", "ONBOARDING_USER_NOT_FOUND_ERROR");
                } else {
                    var isUserInvited = isUserInvitedForCompany(tokenData.email, tokenData.companyNo);
                    if (!isUserInvited.success) {
                        raiseError(isUserInvited.error, "ONBOARDING_USER_LOOKUP_ERROR");
                    } else if (!isUserInvited.isPending) {
                        raiseError("The user is not invited for the company", "ONBOARDING_NO_INVITE_FOUND_ERROR");
                    } else if (!validateOnboardingDate(userResponse.user)) {
                        raiseError("The onboarding date is expired.", "ONBOARDING_DATE_EXPIRED_ERROR");
                    } else {
                        outcome = saveUserDataToState(tokenData);
                    }
                }
            }
        }
        outcome = NodeOutcome.SUCCESS;
    }
} catch (e) {
    logger.error("[ONBOARDING-RESUME] error " + e);
    sharedState.put("errorMessage", e.toString());
    //raiseError("general error: ".concat(e.toString()), "ONBOARDING_DATE_EXPIRED_ERROR");
    outcome = NodeOutcome.ERROR;
}
