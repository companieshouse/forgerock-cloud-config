var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    org.forgerock.openam.auth.node.api,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback
)

var NodeOutcome = {
    SUCCESS: "success",
    ERROR: "error"
}

var Actions = {
    USER_AUTHZ_AUTH_CODE: "user_added_auth_code",
    AUTHZ_USER_REMOVED: "user_removed",
    USER_ACCEPT_INVITE: "user_accepted",
    USER_INVITED: "user_invited"
}

// extracts the user/company from shared state
function extractEventFromState() {
    try {
        var notificationDetails = JSON.parse(sharedState.get("companyNotification"));

        if (!notificationDetails.action || !notificationDetails.companyNumber) {
            logger.error("[NOTIFY AUTHZ USER - SEND EMAIL] missing params to send email to authz users");
            return false;
        }

        if (!notificationDetails.action === Actions.USER_AUTHZ_AUTH_CODE ||
            !notificationDetails.action === Actions.AUTHZ_USER_REMOVED ||
            !notificationDetails.action === Actions.USER_ACCEPT_INVITE ||
            !notificationDetails.action === Actions.USER_INVITED ||
            !(notificationDetails.subjectId || notificationDetails.subjectName || notificationDetails.subjectUserName)
        ) {
            logger.error("[NOTIFY AUTHZ USER - SEND EMAIL] unknown action: " + notificationDetails.action);
            return false;
        }

        return {
            companyNumber: notificationDetails.companyNumber,
            subjectId: notificationDetails.subjectId,
            subjectName: notificationDetails.subjectName,
            subjectUserName: notificationDetails.subjectUserName,
            actorId: notificationDetails.actorId,
            actorName: notificationDetails.actorName,
            actorUserName: notificationDetails.actorUserName,
            action: notificationDetails.action
        }
    } catch (e) {
        logger.error("[NOTIFY AUTHZ USER - SEND EMAIL] error in extracting info from state : " + e);
        return false;
    }
}

//raises a generic error
function sendErrorCallbacks(token, message) {
    action = fr.Action.send(
        new fr.HiddenValueCallback(
            "stage",
            "NOTIFY_AUTHZ_USER_ERROR"
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


//checks whether the user with the given email already exists in IDM
function getUserData(email, id) {
    try {
        var searchTerm = email ? ("/openidm/managed/alpha_user?_queryFilter=userName+eq+%22" + email + "%22") : "/openidm/managed/alpha_user?_queryFilter=_id+eq+%22" + id + "%22";
        var idmUserEndpoint = FIDC_ENDPOINT.concat(searchTerm);
        var request = new org.forgerock.http.protocol.Request();
        var accessToken = transientState.get("idmAccessToken");
        if (accessToken == null) {
            logger.error("[INVITE USER - GET COMPANY DETAILS] Access token not in shared state");
            return {
                success: false,
                message: "[INVITE USER - GET COMPANY DETAILS] Access token not in shared state"
            };
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
                logger.error("[CHECK USER EXIST] user found: " + searchResponse.result[0].toString());
                return {
                    success: true,
                    displayName: searchResponse.result[0].givenName || searchResponse.result[0].userName
                };
            } else {
                logger.error("[CHECK USER EXIST] user NOT found: " + email);
                return {
                    success: false,
                    message: "[CHECK USER EXIST] user NOT found: " + email
                };
            }
        } else {
            logger.error("[CHECK USER EXIST] Error while checking user existence: " + response.getStatus().getCode())
            return {
                success: false,
                message: "[CHECK USER EXIST] Error while checking user existence: " + response.getStatus().getCode()
            };
        }
    } catch (e) {
        logger.error(e)
        return {
            success: false,
            message: "[CHECK USER EXIST] Error: " + e
        };
    }
}

// gets company information
function getCompanyData(companyNo) {

    var request = new org.forgerock.http.protocol.Request();
    var accessToken = transientState.get("idmAccessToken");
    if (accessToken == null) {
        logger.error("[INVITE USER - GET COMPANY DETAILS] Access token not in shared state");
        return {
            success: false,
            message: "[INVITE USER - GET COMPANY DETAILS] Access token not in shared state"
        };
    }

    var requestBodyJson =
    {
        "companyNumber": companyNo
    };

    request.setMethod('POST');
    logger.error("[NOTIFY AUTHZ USER - GET COMPANY DETAILS] Get company details for " + companyNo);
    request.setUri(idmCompanyAuthEndpoint + "?_action=getCompanyByNumber");
    request.getHeaders().add("Authorization", "Bearer " + accessToken);
    request.getHeaders().add("Content-Type", "application/json");
    request.getHeaders().add("Accept-API-Version", "resource=1.0");
    request.setEntity(requestBodyJson);

    var response = httpClient.send(request).get();
    var companyResponse = JSON.parse(response.getEntity().getString());
    if (response.getStatus().getCode() === 200) {
        logger.error("[NOTIFY AUTHZ USER - GET COMPANY DETAILS] 200 response from IDM");

        if (companyResponse.success) {
            return {
                success: true,
                company: companyResponse.company
            };
        } else {
            logger.error("[NOTIFY AUTHZ USER - GET COMPANY DETAILS] Error during company lookup: " + companyResponse.message);
            return {
                success: false,
                message: "[NOTIFY AUTHZ USER - GET COMPANY DETAILS] Error during company lookup: " + companyResponse.message
            }
        }
    } else {
        logger.error("[NOTIFY AUTHZ USER - GET COMPANY DETAILS] Could not get company " + companyNo + " - Error " + response.getEntity().getString());
        return {
            success: false,
            message: "[NOTIFY AUTHZ USER - GET COMPANY DETAILS] Could not get company " + companyNo + " - Error " + response.getEntity().getString()
        };
    }
}

function bodyBuilder(action, recipient, companyName, language, actorName, subjectName) {
    var templates = transientState.get("notifyTemplates");
    var requestBodyJson;
    if (action === Actions.USER_AUTHZ_AUTH_CODE) {
        requestBodyJson = {
            "email_address": recipient,
            "template_id": language === 'EN' ? JSON.parse(templates).en_notify_user_added_auth_code : JSON.parse(templates).cy_notify_user_added_auth_code,
            "personalisation": {
                "company": companyName,
                "actor": actorName
            }
        }
    } else if (action === Actions.AUTHZ_USER_REMOVED) {
        requestBodyJson = {
            "email_address": recipient,
            "template_id": language === 'EN' ? JSON.parse(templates).en_notify_user_removed : JSON.parse(templates).cy_notify_user_removed,
            "personalisation": {
                "company": companyName,
                "actor": actorName,
                "subject": subjectName
            }
        }
    } else if (action === Actions.USER_ACCEPT_INVITE) {
        requestBodyJson = {
            "email_address": recipient,
            "template_id": language === 'EN' ? JSON.parse(templates).en_notify_user_accepted : JSON.parse(templates).cy_notify_user_accepted,
            "personalisation": {
                "company": companyName,
                "actor": actorName,
                "subject": subjectName
            }
        }
    } else if (action === Actions.USER_INVITED) {
        requestBodyJson = {
            "email_address": recipient,
            "template_id": language === 'EN' ? JSON.parse(templates).en_notify_user_invited : JSON.parse(templates).cy_notify_user_invited,
            "personalisation": {
                "company": companyName,
                "actor": actorName,
                "subject": subjectName
            }
        }
    }
    return requestBodyJson;
}

//sends the email (via Notify) to the recipient
function sendEmail(language, action, recipient, companyName, actorName, subjectName) {
    var notifyJWT = transientState.get("notifyJWT");
    var templates = transientState.get("notifyTemplates");
    var request = new org.forgerock.http.protocol.Request();
    var requestBodyJson;
    logger.error("[NOTIFY AUTHZ USER - SEND EMAIL] JWT from transient state: " + notifyJWT);
    logger.error("[NOTIFY AUTHZ USER - SEND EMAIL] Templates from transient state: " + templates);

    request.setUri("https://api.notifications.service.gov.uk/v2/notifications/email");
    try {
        requestBodyJson = bodyBuilder(action, recipient, companyName, language, actorName, subjectName);
    } catch (e) {
        logger.error("[NOTIFY AUTHZ USER - SEND EMAIL] Error while preparing request for Notify: " + e);
        return {
            success: false,
            message: "[NOTIFY AUTHZ USER - SEND EMAIL] Error while preparing request for Notify: ".concat(e)
        };
    }

    logger.error("NOTIFY REQUEST:" + JSON.stringify(requestBodyJson));

    request.setMethod("POST");
    request.getHeaders().add("Content-Type", "application/json");
    request.getHeaders().add("Authorization", "Bearer " + notifyJWT);
    request.setEntity(requestBodyJson);

    var response = httpClient.send(request).get();
    logger.error("[NOTIFY AUTHZ USER - SEND EMAIL] Notify Response: " + response.getStatus().getCode() + " - " + response.getEntity().getString());

    return {
        success: (response.getStatus().getCode() == 201),
        message: (response.getStatus().getCode() == 201) ? ("Message sent") : response.getEntity().getString() + " - req: " + JSON.stringify(requestBodyJson) + " - JWT: " + notifyJWT
    };
}

//extracts the language form headers (default to EN)
function getSelectedLanguage(requestHeaders) {
    if (requestHeaders && requestHeaders.get("Chosen-Language")) {
        var lang = requestHeaders.get("Chosen-Language").get(0);
        logger.error("[NOTIFY AUTHZ USER - SEND EMAIL] selected language: " + lang);
        return lang;
    }
    logger.error("[NOTIFY AUTHZ USER - SEND EMAIL] no selected language found - defaulting to EN");
    return 'EN';
}

// main execution flow
// USER_AUTHZ_AUTH_CODE: "user_added_auth_code",
// AUTHZ_USER_REMOVED: "user_removed",
// USER_ACCEPT_INVITE: "user_accepted",
// USER_INVITED: "user_invited"

// var testData = {
//     companyNumber: "00116457",
//     subjectId: null,
//     subjectName: null,
//     subjectUserName: "matteo.formica@amido.com",
//     actorId: "e178fe50-91e6-4caf-bcc6-dcc38e5083cd",
//     actorName: null,
//     actorUserName: null,
//     action: "user_removed"
// }

// sharedState.put("companyNotification", JSON.stringify(testData));

var FIDC_ENDPOINT = "https://openam-companieshouse-uk-dev.id.forgerock.io";
var idmCompanyAuthEndpoint = "https://openam-companieshouse-uk-dev.id.forgerock.io/openidm/endpoint/companyauth/";

try {
    var notifyEventData = extractEventFromState();
    var language = getSelectedLanguage(requestHeaders);

    if (!notifyEventData) {
        logger.error("[NOTIFY AUTHZ USER - SEND EMAIL] Error while extracting notification input data from shared state - skipping notification email sending.");
    } else {
        var company = getCompanyData(notifyEventData.companyNumber).company;
        if (company) {
            var actorName = notifyEventData.actorName || (notifyEventData.actorUserName ? getUserData(notifyEventData.actorUserName, null).displayName : getUserData(null, notifyEventData.actorId).displayName);
            var subjectName = notifyEventData.subjectName || (notifyEventData.subjectUserName ? getUserData(notifyEventData.subjectUserName, null).displayName : getUserData(null, notifyEventData.subjectId).displayName);

            var failedEmails = 0;
            var sentEmails = 0;
            for (var index = 0; index < company.members.length; index++) {
                if (company.members[index].membershipStatus === 'confirmed') {
                    logger.error("[NOTIFY AUTHZ USER - SEND EMAIL] sending email to  : " + company.members[index].email);
                    var sendEmailResult = sendEmail(language, notifyEventData.action, company.members[index].email, company.name, actorName, subjectName);
                    var failedEmails = 0;
                    if (!sendEmailResult.success) {
                        logger.error("[NOTIFY AUTHZ USER - SEND EMAIL] Error while sending email to : " + company.members[index].email + " - error: " + sendEmailResult.message);
                        failedEmails++;
                    } else {
                        logger.error("[NOTIFY AUTHZ USER - SEND EMAIL] Notification email successfully sent to : " + company.members[index].email);
                        sentEmails++;
                    }
                } else {
                    logger.error("[NOTIFY AUTHZ USER - SEND EMAIL] The user " + company.members[index].email + " is not 'confirmed' for company - notification email not sent");
                }
            }

            logger.error("[NOTIFY AUTHZ USER - SEND EMAIL] All " + sentEmails + " authorised company members have been notified via email(s) successfully! Notification failed for " + failedEmails + " authorised company members");           
        } else {
            logger.error("[NOTIFY AUTHZ USER - SEND EMAIL] Error while company lookup");
        }
    }
    outcome = NodeOutcome.SUCCESS;
} catch (e) {
    logger.error("[NOTIFY AUTHZ USER - SEND EMAIL] Error : " + e);
    sharedState.put("errorMessage", e.toString());
    outcome = NodeOutcome.ERROR;
}
