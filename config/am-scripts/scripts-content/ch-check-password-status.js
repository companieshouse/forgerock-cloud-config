var NodeOutcome = {
    VALID: "valid",
    UPDATE: "update"
}

// frIndexedString3
var PASSWORD_MIGRATED_FIELD = "fr-attr-istr3";

function checkPasswordStatus() {
    var userId = sharedState.get("_id");
    logger.error("[CHECK PASSWORD STATUS] Found userId: " + userId);

    if (idRepository.getAttribute(userId, PASSWORD_MIGRATED_FIELD).iterator().hasNext()) {
        var status = idRepository.getAttribute(userId, PASSWORD_MIGRATED_FIELD).iterator().next();
        logger.error("[CHECK PASSWORD STATUS] Found status: " + status);
        if (status == "migrated") {
            // Migrated user has already validated their password
            return NodeOutcome.VALID;
        } else {
            // Migrated user validation is pending
            return NodeOutcome.UPDATE;
        }
    } else {
        // Not a migrated user
        logger.error("[CHECK PASSWORD STATUS] " + PASSWORD_MIGRATED_FIELD + " not set");
        return NodeOutcome.VALID;
    }
}

outcome = checkPasswordStatus();