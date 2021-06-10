var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.NameCallback,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback,
    javax.security.auth.callback.ConfirmationCallback,
    java.lang.String
)

var NodeOutcome = {
    SKIP: "skip",
    OTP: "otp",
    NAME_ONLY: "name_only",
    FAIL: "fail"
}

function isMobile(number) {
    var mobileValid = /^((0044|0|\+44)7\d{3}\s?\d{6})$/.test(number);
    if (mobileValid) {
        return true;
    }
    return false;
}

try {
    var PHONE_NUMBER_FIELD = "telephoneNumber";
    var FULL_NAME_FIELD = "givenName";
    var nameFound = false;
    var phoneFound = false;
    var SKIP_OPTION_INDEX = 0;

    var debug = String("Shared state: " + sharedState.toString() + "\\n");
    logger.error("[EWF UPDATE PROFILE] Shared state: " + debug);

    var debug2 = String("Shared state: " + transientState.toString() + "\\n");
    logger.error("[EWF UPDATE PROFILE]  Transient state: " + debug2);
    var skipCallback = new fr.ConfirmationCallback(
        "Do you want to skip?",
        fr.ConfirmationCallback.INFORMATION,
        ["SKIP", "SUBMIT"],
        SKIP_OPTION_INDEX
    );

    var noMissingFields = 0;
    var userId = sharedState.get("_id");
    //checks presence of phone number in user profile
    if (idRepository.getAttribute(userId, PHONE_NUMBER_FIELD).iterator().hasNext()) {
        logger.error("[EWF UPDATE PROFILE] Found phone number");
        phoneFound = true;
    } else {
        logger.error("[EWF UPDATE PROFILE] phone number not found");
        noMissingFields++;
    }

    //checks presence of full name in user profile
    if (idRepository.getAttribute(userId, FULL_NAME_FIELD).iterator().hasNext()) {
        logger.error("[EWF UPDATE PROFILE] Found givenName");
        nameFound = true;
    } else {
        logger.error("[EWF UPDATE PROFILE] givenName not found");
        noMissingFields++;
    }

    if (callbacks.isEmpty()) {

        if (phoneFound && nameFound) {
            outcome = NodeOutcome.SKIP;
        } else {

            //initial callbacks
            var infoMessage = "Update your personal details";
            var level = fr.TextOutputCallback.INFORMATION;
            var errorMessage = sharedState.get("errorMessage");


            var stageName = "EWF_PROFILE";
            logger.error("[EWF UPDATE PROFILE] userId: " + userId);

            if (!phoneFound && nameFound) {
                if (errorMessage !== null) {
                    var errorProps = sharedState.get("pagePropsJSON");
                    level = fr.TextOutputCallback.ERROR;
                    infoMessage = errorMessage.concat(" Please try again.");
                    action = fr.Action.send(
                        new fr.TextOutputCallback(level, infoMessage),
                        new fr.HiddenValueCallback("PHONE", "PHONE"),
                        new fr.NameCallback("What is your mobile number? (optional)"),
                        new fr.HiddenValueCallback("stage", stageName),
                        new fr.HiddenValueCallback("pagePropsJSON", errorProps),
                        skipCallback
                    ).build();
                } else {
                    action = fr.Action.send(
                        new fr.TextOutputCallback(level, infoMessage),
                        new fr.HiddenValueCallback("PHONE", "PHONE"),
                        new fr.NameCallback("What is your mobile number? (optional)"),
                        new fr.HiddenValueCallback("stage", stageName),
                        skipCallback
                    ).build();
                }
            } else if (phoneFound && !nameFound) {
                if (errorMessage !== null) {
                    var errorProps = sharedState.get("pagePropsJSON");
                    level = fr.TextOutputCallback.ERROR;
                    infoMessage = errorMessage.concat(" Please try again.");
                    action = fr.Action.send(
                        new fr.TextOutputCallback(level, infoMessage),
                        new fr.HiddenValueCallback("NAME", "NAME"),
                        new fr.NameCallback("What is your full name? (optional)"),
                        new fr.HiddenValueCallback("stage", stageName),
                        skipCallback,
                        new fr.HiddenValueCallback("pagePropsJSON", errorProps)
                    ).build();
                } else {
                    action = fr.Action.send(
                        new fr.TextOutputCallback(level, infoMessage),
                        new fr.HiddenValueCallback("NAME", "NAME"),
                        new fr.NameCallback("What is your full name? (optional)"),
                        new fr.HiddenValueCallback("stage", stageName),
                        skipCallback
                    ).build();
                }
            } else if (!phoneFound && !nameFound) {
                if (errorMessage !== null) {
                    var errorProps = sharedState.get("pagePropsJSON");
                    level = fr.TextOutputCallback.ERROR;
                    infoMessage = errorMessage.concat(" Please try again.");
                    action = fr.Action.send(
                        new fr.TextOutputCallback(level, infoMessage),
                        new fr.HiddenValueCallback("BOTH", "BOTH"),
                        new fr.NameCallback("What is your full name? (optional)"),
                        new fr.NameCallback("What is your mobile number? (optional)"),
                        new fr.HiddenValueCallback("stage", stageName),
                        skipCallback,
                        new fr.HiddenValueCallback("pagePropsJSON", errorProps)
                    ).build();
                } else {
                    action = fr.Action.send(
                        new fr.TextOutputCallback(level, infoMessage),
                        new fr.HiddenValueCallback("BOTH", "BOTH"),
                        new fr.NameCallback("What is your full name? (optional)"),
                        new fr.NameCallback("What is your mobile number? (optional)"),
                        new fr.HiddenValueCallback("stage", stageName),
                        skipCallback
                    ).build();
                }
            }
        }
    } else {
        // returning callbacks

        logger.error("[EWF UPDATE PROFILE]  callbacks: " + callbacks.toString());

        var indexSkipCallback;
        var indexNameCallback;
        var indexPhoneCallback;

        if (noMissingFields === 2) {
            indexSkipCallback = 5;
            indexNameCallback = 2;
            indexPhoneCallback = 3;
        } else {
            indexSkipCallback = 4;
            indexNameCallback = 2;
            indexPhoneCallback = 2;
        }

        var selection = callbacks.get(indexSkipCallback).getSelectedIndex();
        logger.error("[EWF UPDATE PROFILE]  selection " + selection);
        if (selection === SKIP_OPTION_INDEX) {
            logger.error("[EWF UPDATE PROFILE] selected SKIP");
            outcome = NodeOutcome.SKIP;
        } else {
            logger.error("[EWF UPDATE PROFILE] selected SUBMIT");

            logger.error("[EWF UPDATE PROFILE] selected SUBMIT");
            var type = callbacks.get(1).getValue();
            logger.error("[EWF UPDATE PROFILE] type: " + type);
            var payload;
            if ((type === "PHONE" || type === "BOTH") && newPhoneNumber && !isMobile(newPhoneNumber)) {
                sharedState.put("errorMessage", "Invalid mobile number entered.");
                sharedState.put("pagePropsJSON", JSON.stringify(
                    {
                        'errors': [{
                            label: "Invalid mobile number entered",
                            token: "UPDATE_PHONE_INVALID_MOBILE_NUMBER",
                            fieldName: "IDToken".concat(indexPhoneCallback),
                            anchor: "IDToken".concat(indexPhoneCallback)
                        }]
                    }));
                action = fr.Action.goTo(NodeOutcome.FAIL).build();
            } else {
                var newName, newPhoneNumber;
                if (type === "NAME" || type === "BOTH") {
                    newName = callbacks.get(indexNameCallback).getName();
                    logger.error("[EWF UPDATE PROFILE] new name: " + newName);
                } 
                if (type === "PHONE" || type === "BOTH") {
                    newPhoneNumber = callbacks.get(indexPhoneCallback).getName();
                    logger.error("[EWF UPDATE PROFILE] new phone: " + newPhoneNumber);
                }

                if (type === "BOTH") {
                    payload = {
                        "telephoneNumber": newPhoneNumber,
                        "givenName": newName
                    }
                } else if (type === "PHONE") {
                    payload = {
                        "telephoneNumber": newPhoneNumber
                    }
                } else if (type === "NAME") {
                    payload = {
                        "givenName": newName
                    }
                }
                sharedState.put("objectAttributes", payload);

                //got the OTP route if the phone has been changed and phone is valid
                if (newPhoneNumber) {
                    transientState.put("registrationMFA", true);
                    action = fr.Action.goTo(NodeOutcome.OTP).build();
                } else {
                    action = fr.Action.goTo(NodeOutcome.NAME_ONLY).build();
                }
            }
        }
    }
} catch (e) {
    logger.error("[EWF COMPLETE PROFILE] error: " + e);
}