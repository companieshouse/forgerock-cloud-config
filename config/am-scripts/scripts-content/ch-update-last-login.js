var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action
)

logger.error("Update last login");
var userId = sharedState.get("_id");

try {
    // Get current time in RFC-4517 format
    var lastLogin = formatDate();

    logger.error("Seting last login to " + lastLogin + " for user " + userId);

    // Use AM representation of attribute
    idRepository.setAttribute(userId, "fr-attr-idate1", [lastLogin]); 
} catch(e) {
    logger.error("Update Last Login error: " + e)
}

function formatDate() {
    var date = new Date();
    var result = [];
    result.push(date.getFullYear());
    result.push(padding(date.getMonth() + 1));
    result.push(padding(date.getDate()));
    result.push(padding(date.getHours()));
    result.push(padding(date.getMinutes()));
    result.push(padding(date.getSeconds()));
    result.push("Z");
    return result.join('');
}

function padding(num) {
    return num < 10 ? '0' + num : num;
}

outcome = "true";