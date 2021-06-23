var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action
)

try {
    sharedState.put("pagePropsJSON", JSON.stringify(
        {
            'errors': [{
                label: "The OTP provided is not valid. Please try again.",
                token: "OTP_NOT_VALID",
                fieldName: "IDToken3",
                anchor: "IDToken3"
            }]
        }));

    transientState.put("error", "The OTP provided is not valid. Please try again");
} catch (e) {
    logger.error("[RESET PWD] Error populating transient state: " + e);
}

outcome = "true";