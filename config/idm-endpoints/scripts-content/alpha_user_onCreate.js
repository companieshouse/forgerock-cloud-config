require('onCreateUser').setDefaultFields(object);
logger.info("Setting email as username " + object.mail);
object.mail = object.userName;
object.sn = object.userName;

var request = {
  "url": "https://ypdak57qu6.execute-api.eu-west-1.amazonaws.com/default/dummyBCryptValue",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    },
    "body": "{\"convert\": \"" + object.password + "\"}"
  };

logger.error("OnCreate PARENT_USERNAME: {}", object.frIndexedString1);
logger.error("OnCreate LEGACY_PASSWORD: {}", object.frIndexedString2);

if (object.frIndexedString1 != null) {
  logger.error("OnCreate already has PARENT_USERNAME: {}", object.frIndexedString1);
} else {
  logger.error("OnCreate generate MD5");
  //hashTest = openidm.hash(object.mail, "MD5");
  hashTest = getRandomHex(32);
  logger.error("OnCreate generated PARENT_USERNAME hash " + hashTest);

  // Update the field with the hash
  //object.frIndexedString1 = hashTest.$crypto.value.data;
  object.frIndexedString1 = hashTest;
}


if (object.frIndexedString2 != null) {
  // User is created with legacy password from WebFiling - leave it as is
  logger.error("OnCreate already has LEGACY_PASSWORD: {}", object.frIndexedString2);

  // Update related params so we know what type of BCrypt hash it is
  object.frIndexedString3 = 'pending';
  object.frIndexedString5 = 'webfiling';
} else {
  try {
    logger.debug("OnCreate LEGACY_PASSWORD request: {}", request);
    var result = openidm.action("external/rest","call", request);
    logger.debug("OnCreate LEGACY_PASSWORD result: {}", result);

    var resultJson = JSON.parse(result);
    var bodyJson = JSON.parse(resultJson.body);

    object.frIndexedString2 = bodyJson.hash;

    // Update related params so we know what type of BCrypt hash it is
    object.frIndexedString3 = 'migrated';
    object.frIndexedString5 = 'webfiling';
  }
  catch (e) {
    logger.info("OnCreate LEGACY_PASSWORD ERROR");
    if (e.javaException.getCode() == "201"){
      logger.info("OnCreate LEGACY_PASSWORD CODE HTTP: 201")
    } else if (e.javaException.getCode() == "400") {
      logger.info("OnCreate CODE HTTP: 400") ;
    }
    logger.info("OnCreate LEGACY_PASSWORD error detail: {}", e);
  }
}

function getRandomHex(size) {
  let result = [];
  let hexRef = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];

  for (let n = 0; n < size; n++) {
    result.push(hexRef[Math.floor(Math.random() * 16)]);
  }
  return result.join('');
}
