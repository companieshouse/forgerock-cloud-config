(function () {
    var patch = [
        {   "operation" : "replace", 
            "field" : "/description", 
            "value" : "I have been set by a task!!!" 
        }
    ];

    logger.info("TASK - Removing expired onboarded user on {} ({})", input.mail, objectID);
    openidm.patch(objectID, null, patch);
//    logger.debug("TASK - Removing expired onboarded user on {} ({})", input.mail, objectID);
//    openidm.delete(objectID, null);
}());