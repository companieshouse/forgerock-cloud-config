(function () {
    logger.info("TASK - REMOVED EXPIRED ONBOARDED USER - Removing expired onboarded user on {} ({})", input.mail, objectID);
    openidm.delete(objectID, null);
}());