(function () {
    logger.info("TASK - Removing expired onboarded user on {} ({})", input.mail, objectID);
    openidm.delete(objectID, null);
}());