var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action
)

var NodeOutcome = {
    TRUE: "true",
    FALSE: "false"
}

function fetchHashedPassword() {
    var userId = sharedState.get("_id");
    logger.error("[FETCH HASHED PASSWORD] Found userId: " + userId);
    if (idRepository.getAttribute(userId, "fr-attr-istr2").iterator().hasNext()) {
        var legacyPassword = idRepository.getAttribute(userId, "fr-attr-istr2").iterator().next();
        logger.error("[FETCH HASHED PASSWORD] Found legacyPassword: " + legacyPassword);
        sharedState.put("hashedCredential", legacyPassword);
        return NodeOutcome.TRUE;
    } else {
        logger.error("[FETCH HASHED PASSWORD] Couldn't find legacyPassword");
        return NodeOutcome.FALSE;
    }
}

outcome = fetchHashedPassword();