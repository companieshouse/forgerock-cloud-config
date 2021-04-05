var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action
)

var LEGACY_PASSWORD_FIELD = "fr-attr-istr2";

var NodeOutcome = {
    TRUE: "true",
    FALSE: "false"
}

function fetchHashedPassword() {
    var userId = sharedState.get("_id");
    logger.error("[FETCH HASHED PASSWORD] Found userId: " + userId);

    if (idRepository.getAttribute(userId, LEGACY_PASSWORD_FIELD).iterator().hasNext()) {
        var legacyPassword = idRepository.getAttribute(userId, LEGACY_PASSWORD_FIELD).iterator().next();
        logger.error("[FETCH HASHED PASSWORD] Found legacyPassword: " + legacyPassword);
        sharedState.put("hashedCredential", legacyPassword);

        var password = transientState.get("password");
        sharedState.put("credential", password);

        return NodeOutcome.TRUE;
    } else {
        logger.error("[FETCH HASHED PASSWORD] Couldn't find legacyPassword");
        return NodeOutcome.FALSE;
    }
}

outcome = fetchHashedPassword();