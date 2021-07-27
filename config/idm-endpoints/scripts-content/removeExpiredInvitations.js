(function () {
    // TODO replace with correct logic
    var patch = [
        {   "operation" : "replace", 
            "field" : "/description", 
            "value" : "I have been set by a task!!!" 
        }
    ];

    logger.info("TASK - Removing expired invitations on {} ({})", input.mail, objectID);
    openidm.patch(objectID, null, patch);
}());