var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action
)

var NodeOutcome = {
    SUCCESS: "true",
    ERROR: "false"
}

// This variable value will be replaced with the relevant value in the target environment (stored in AM secret store) 
var chJwtSigningKey = "cGFzc3dvcmQ=";
var chJwtEncryptionKey = "Syz1K5XQCZtq7FkE+GNvgZPeFyvUXJdemIW7CQjM18U=";

// saves the JWT to transient state for future use
function saveState() {
    try {
        transientState.put("chJwtSigningKey", chJwtSigningKey);
        transientState.put("chJwtEncryptionKey", chJwtEncryptionKey);
    } catch (e) {
        logger.error("Error while setting state - " + e);
        return NodeOutcome.ERROR;
    }
    return NodeOutcome.SUCCESS;
}

//main execution flow
action = fr.Action.goTo(saveState()).build()
