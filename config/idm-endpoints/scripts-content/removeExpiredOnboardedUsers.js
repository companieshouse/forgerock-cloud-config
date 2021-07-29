(function () {
    logger.info("TASK - REMOVED EXPIRED ONBOARDED USER - Removing expired onboarded user on {} ({})", input.mail, objectID);
    try {
        openidm.delete(objectID, null);
    } catch (e) {
        logger.error("TASK - REMOVED EXPIRED ONBOARDED USER - Error while expired onboarded user on {} ({}) - {}", input.mail, objectID, e);
    }
}());