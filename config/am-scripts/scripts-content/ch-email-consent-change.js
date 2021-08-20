/* 
  ** INPUT DATA
    * QUERY PARAMS
     - [optional] action: the action to be performed (changeUpdates, changeMarketing)

  ** INPUT DATA    
    * TRANSIENT STATE
      - 'idmAccessToken': the IDM access token

      * SHARED STATE:
      - '_id' : the ID of the user performing the operation (session owner/actor)
      - [optional] 'errorMessage': error message to display from previous attempts
      - [optional] 'pagePropsJSON': the JSON props for the UI to display 
      
  ** OUTCOMES
    - 'collect_consent': the tree will skip the 'change' logic and show the email consent screen (only if never set before)
    - 'cancel': the user is in the 'change' screen, and decides to skip/cancel the operation
    - 'error': an error has happened during processing
*/

var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.NameCallback,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback,
    javax.security.auth.callback.ConfirmationCallback,
    org.forgerock.openam.authentication.callbacks.BooleanAttributeInputCallback,
    javax.security.auth.callback.ChoiceCallback,
    java.lang.String
)

var NodeOutcome = {
    COLLECT_CONSENT: "collect_consent",
    CANCEL: "cancel",
    ERROR: "error"
}

var PreferencesFields = {
    UPDATES: "updates",
    MARKETING: "marketing"
}

var ConfirmIndex = {
    SUBMIT: 0,
    CANCEL: 1
}

function raiseError(message, token) {
    action = fr.Action.send(
        new fr.HiddenValueCallback(
            "stage",
            "UPDATE_CONSENT_ERROR"
        ),
        new fr.HiddenValueCallback(
            "pagePropsJSON",
            JSON.stringify({ "errors": [{
                "label": message,
                "token": token 
            }]})
        ),
        new fr.TextOutputCallback(
            fr.TextOutputCallback.ERROR,
            message
        )
    ).build()
}

function updatePreferences(userId, field, value) {
    var accessToken = sharedState.get("idmAccessToken");
    if (accessToken == null) {
        logger.error("[UPDATE EMAIL CONSENT] Access token not in shared state")
        return {
            success: false,
            message: "Access token not in transient state"
        }
    }
    logger.error("[UPDATE EMAIL CONSENT] Updating counter to " + value);

    var request = new org.forgerock.http.protocol.Request();
    request.setMethod('PATCH');
    request.setUri(alphaUserUrl + userId);
    request.getHeaders().add("Authorization", "Bearer " + accessToken);
    request.getHeaders().add("Content-Type", "application/json");
    var requestBodyJson = [
        {
            "operation": "replace",
            "field": "/preferences/" + field,
            "value": value
        }
    ];
    request.setEntity(requestBodyJson);

    var response = httpClient.send(request).get();

    if (response.getStatus().getCode() === 200) {
        logger.error("[UPDATE EMAIL CONSENT] Counter updated correctly");
        return true;
    } else {
        logger.error("[UPDATE EMAIL CONSENT] Error while updating counter value: " + response.getEntity().getString());
        return false;
    }
}

// reads the current invalid login attempts counter from frUnindexedInteger1
function lookupUser(userId) {
    try {
        var accessToken = transientState.get("idmAccessToken");
        if (accessToken == null) {
            logger.error("[UPDATE EMAIL CONSENT] Access token not in transient state")
            return {
                success: false,
                message: "Access token not in transient state"
            }
        } else {
            sharedState.put("idmAccessToken", accessToken);
        }

        var request = new org.forgerock.http.protocol.Request();

        request.setMethod('GET');
        request.setUri(alphaUserUrl + userId + "?_fields=preferences");
        request.getHeaders().add("Authorization", "Bearer " + accessToken);
        request.getHeaders().add("Content-Type", "application/json");
        var response = httpClient.send(request).get();
        if (response.getStatus().getCode() === 200) {
            return {
                success: true,
                user: JSON.parse(response.getEntity().getString())
            }
        } else {
            logger.error("[UPDATE EMAIL CONSENT] Error while looking up user " + userId + " : " + response.getStatus().getCode())
            return {
                success: false,
                message: "Error while GET user " + userId + " : " + response.getStatus().getCode() + " - request: " + alphaUserUrl + userId + "_fields=preferences"
            }
        }
    } catch (e) {
        logger.error("[UPDATE EMAIL CONSENT] lookup User error: " + e);
        return {
            success: false,
            message: "Error while looking up user: " + e
        };
    }
}

//extracts the company number and user ID from the query parameters
function fetchActionParameter() {
    var action = requestParameters.get("action");

    if (action && (action.get(0).equals("changeUpdates") || action.get(0).equals("changeMarketing"))) {
        return {
            changeUpdates: action.get(0).equals("changeUpdates"),
            changeMarketing: action.get(0).equals("changeMarketing")
        }
    }
    logger.error("[UPDATE EMAIL CONSENT] action parameter not found in request, or different from 'changeUpdates' or 'changeMarketing'");
    return false;
}

// execution flow
var alphaUserUrl = "https://openam-companieshouse-uk-dev.id.forgerock.io/openidm/managed/alpha_user/";
try {
    var answers = ["YES", "NO"];
    var paramsResponse = fetchActionParameter();
    var sessionOwnerId = sharedState.get("_id");
    if (!paramsResponse) {
        action = fr.Action.goTo(NodeOutcome.COLLECT_CONSENT).build();
    } else {
        if (callbacks.isEmpty()) {
            var userResponse = lookupUser(sessionOwnerId);
            var currentEmailUpdatesValue = userResponse.user.preferences ? userResponse.user.preferences.updates : false;
            var currentEmailMarketingValue = userResponse.user.preferences ? userResponse.user.preferences.marketing : false;
            if (!userResponse.success) {
                raiseError(userResponse.message, "USER_NOT_FOUND");
            } else {
                sharedState.put("user", JSON.stringify(userResponse.user));

                var infoMessage = paramsResponse.changeUpdates ? "Receive email updates?" : "Receive marketing updates?";
                var errorMessage = sharedState.get("errorMessage");
                var level = fr.TextOutputCallback.INFORMATION;
                if (errorMessage !== null) {
                    var errorProps = sharedState.get("pagePropsJSON");
                    level = fr.TextOutputCallback.ERROR;
                    infoMessage = errorMessage.concat(" Please try again.");

                    action = fr.Action.send(
                        new fr.TextOutputCallback(level, infoMessage),
                        new fr.ChoiceCallback(
                            infoMessage,
                            answers,
                            0,
                            false
                        ),
                        new fr.TextOutputCallback(fr.TextOutputCallback.INFORMATION, "Do you want to cancel?"),
                        new fr.ConfirmationCallback(
                            "Do you want to confirm the changes?",
                            fr.ConfirmationCallback.INFORMATION,
                            ["SUBMIT", "CANCEL"],
                            0),
                        new fr.HiddenValueCallback("stage", paramsResponse.changeUpdates ? "CHANGE_CONSENT_UPDATES" : "CHANGE_CONSENT_MARKETING"),
                        new fr.HiddenValueCallback("currentValue", paramsResponse.changeUpdates ? currentEmailUpdatesValue : currentEmailMarketingValue),
                        new fr.HiddenValueCallback("pagePropsJSON", errorProps)
                    ).build();
                } else {
                    action = fr.Action.send(
                        new fr.TextOutputCallback(level, infoMessage),
                        new fr.ChoiceCallback(
                            infoMessage,
                            answers,
                            0,
                            false
                        ),
                        new fr.TextOutputCallback(fr.TextOutputCallback.INFORMATION, "Do you want to cancel?"),
                        new fr.ConfirmationCallback(
                            "Do you want to confirm the changes?",
                            fr.ConfirmationCallback.INFORMATION,
                            ["SUBMIT", "CANCEL"],
                            0),
                        new fr.HiddenValueCallback("stage", paramsResponse.changeUpdates ? "CHANGE_CONSENT_UPDATES" : "CHANGE_CONSENT_MARKETING"),
                        new fr.HiddenValueCallback("currentValue", paramsResponse.changeUpdates ? currentEmailUpdatesValue : currentEmailMarketingValue)
                    ).build();
                }
            }
        } else {
            var user = JSON.parse(sharedState.get("user"));
            var currentEmailUpdatesValue = user.preferences ? user.preferences.updates : false;
            var currentEmailMarketingValue = user.preferences ? user.preferences.marketing : false;
            var selection = callbacks.get(1).getSelectedIndexes()[0];

            var confirmIndex = callbacks.get(3).getSelectedIndex();
            logger.error("[UPDATE EMAIL CONSENT] confirm remove: " + confirmIndex);

            if (confirmIndex === ConfirmIndex.SUBMIT) { 

                logger.error("[UPDATE EMAIL CONSENT] email updates selection: " + selection);
                var updateResponse;

                if (paramsResponse.changeUpdates) {
                    updateResponse = updatePreferences(sessionOwnerId, PreferencesFields.UPDATES, (selection === 0));
                } else if (paramsResponse.changeMarketing) {
                    updateResponse = updatePreferences(sessionOwnerId, PreferencesFields.MARKETING, (selection === 0));
                }

                if (!updateResponse) {
                    sharedState.put("errorMessage", "Error occurred while updating email preferences.");
                    sharedState.put("pagePropsJSON", JSON.stringify(
                        {
                            'errors': [{
                                label: "Error occurred while updating preferences.",
                                token: "UPDATE_CONSENT_ERROR",
                                fieldName: "IDToken1",
                                anchor: "IDToken1"
                            }]
                        }));
                    action = fr.Action.goTo(NodeOutcome.ERROR).build();
                } else {
                    action = fr.Action.send(
                        new fr.TextOutputCallback(
                            fr.TextOutputCallback.INFORMATION,
                            "Preferences have been updated"
                        ),
                        new fr.HiddenValueCallback(
                            "stage",
                            paramsResponse.changeUpdates ? "UPDATE_EMAIL_UPDATES_CONSENT_CONFIRMATION" : "UPDATE_EMAIL_MARKETING_CONSENT_CONFIRMATION"
                        ),
                        new fr.HiddenValueCallback(
                            "pagePropsJSON",
                            JSON.stringify({ "user": user, "newValue": (selection === 0) })
                        )
                    ).build();
                }
            } else {
                action = fr.Action.goTo(NodeOutcome.CANCEL).build();
            }
        }
    }
} catch (e) {
    logger.error("[UPDATE EMAIL CONSENT] ERROR: " + e);
    sharedState.put("errorMessage", e.toString());
    action = fr.Action.goTo(NodeOutcome.ERROR).build();
}

