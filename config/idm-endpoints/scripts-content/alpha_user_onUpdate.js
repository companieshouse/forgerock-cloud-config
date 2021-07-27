require('onUpdateUser').preserveLastSync(object, oldObject, request);
newObject.mail = newObject.userName;
newObject.sn = newObject.userName;

let newTimestamps = [];

try {
    let companies = newObject.memberOfOrg;
    if (companies) {
        companies.forEach(company => {
            if (company._refProperties.membershipStatus === 'confirmed') {
                newTimestamps.push(company._refProperties.inviteTimestamp);
            }
        })
    }
    newObject.frIndexedMultivalued1 = newTimestamps;
} catch (e) {
    logger.error("TASK ONUPDATE error: " + e);
}

if (newObject.password != oldObject.password) {
    var request = {
        "url": "https://ypdak57qu6.execute-api.eu-west-1.amazonaws.com/default/dummyBCryptValue",
        "method": "POST",
        "headers": {
            "Content-Type": "application/json"
        },
        "body": "{\"convert\": \"" + newObject.password + "\"}"
    };

    try {
        logger.debug("OnUpdate request: {}", request);
        var result = openidm.action("external/rest", "call", request);
        logger.debug("OnUpdate result: {}", result);

        var resultJson = JSON.parse(result);
        var bodyJson = JSON.parse(resultJson.body);

        newObject.frIndexedString2 = bodyJson.hash;

        // Update related params so we know what type of BCrypt hash it is
        newObject.frIndexedString3 = 'migrated';
        newObject.frIndexedString5 = 'webfiling';
    }
    catch (e) {
        logger.info("OnUpdate ERROR");
        if (e.javaException.getCode() == "201") {
            logger.info("OnUpdate CODE HTTP: 201")
        } else if (e.javaException.getCode() == "400") {
            logger.info("OnUpdate CODE HTTP: 400");
        }
        logger.info("OnUpdate Error Detail: {}", e);
    }
}