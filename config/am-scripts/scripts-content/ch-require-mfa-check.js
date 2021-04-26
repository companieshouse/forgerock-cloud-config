var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action
)

var userId = sharedState.get("_id");

// Use AM representation of attribute
var LAST_LOGIN_FIELD = "fr-attr-idate1";

var checkMFA = false;

try {
    if (idRepository.getAttribute(userId, LAST_LOGIN_FIELD).iterator().hasNext()) {
        var lastLogin = String(idRepository.getAttribute(userId, LAST_LOGIN_FIELD).iterator().next());
        
        logger.error("[MFA-CHECK] lastLogin: " + lastLogin); // e.g. 20210317114005Z

        if (lastLogin.length > 0) {
            var year = lastLogin.substring(0, 4);
            var month = lastLogin.substring(4, 6);
            var offsetMonth = parseInt(month) - 1;
            var day = lastLogin.substring(6, 8);
            var hour = lastLogin.substring(8, 10);
            var min = lastLogin.substring(10, 12);
            var sec = lastLogin.substring(12, 14);

            var lastLoginDateUTC = Date.UTC(year,offsetMonth,day,hour,min,sec);

            var now = new Date();

            var intervalDays = 30;
            var intervalInMillis = intervalDays * 86400 * 1000;

            var delta = now.getTime() - lastLoginDateUTC; // Difference in ms
            if (delta > intervalInMillis) {
                logger.error("[MFA-CHECK] User requires MFA check");
                checkMFA = true;
            } else {
                logger.error("[MFA-CHECK] User doesn't require MFA check");
            }
        }
    }

    if (checkMFA) {
        outcome = "true";
    } else {
        outcome = "false"; 
    }
} catch(e) {
    logger.error("[MFA-CHECK] Require MFA Check error: " + e);
    outcome = "false";
}
