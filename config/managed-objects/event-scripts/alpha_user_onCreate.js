// Alpha_User On Create
require('onCreateUser').setDefaultFields(object);
logger.info('Setting email as username ' + object.mail);
object.mail = object.userName;
object.sn = object.userName;

var HASH_CONVERT_API_URL = identityServer.getProperty('esv.5759beed9b.generatehashapiurl');
var HASH_CONVERT_API_KEY = identityServer.getProperty('esv.cbd3eb4482.generatehashapikey');

var request = {
    'url': HASH_CONVERT_API_URL,
    'method': 'POST',
    'headers': {
        'Content-Type': 'application/json',
        'x-api-key' : HASH_CONVERT_API_KEY
    },
    'body': '{"convert": "' + object.password + '"}'
};

logger.debug('OnCreate current PARENT_USERNAME: {}', object.frIndexedString1);
logger.debug('OnCreate current LEGACY_PASSWORD: {}', object.frIndexedString2);

try {
    if (object.frIndexedString1 != null) {
        logger.info('OnCreate the user already has PARENT_USERNAME: {}', object.frIndexedString1);
    } else {
        hashTest = getRandomHex(32);
        logger.debug('OnCreate generated PARENT_USERNAME: ' + hashTest);

        // Update the field with the hash
        object.frIndexedString1 = hashTest;
    }

    if (object.frIndexedString2 != null) {
        // User is created with legacy password from WebFiling - leave it as is
        logger.info('OnCreate the user already has LEGACY_PASSWORD: {}', object.frIndexedString2);

        // Update related params so we know what type of BCrypt hash it is
        object.frIndexedString3 = 'pending';
        object.frIndexedString5 = 'webfiling';
    } else {
        logger.info('OnCreate the user does not have a LEGACY_PASSWORD set: generating one');
        if(!HASH_CONVERT_API_URL || !HASH_CONVERT_API_KEY){
            logger.error('OnCreate could not find Hash Generation API details - LEGACY PASSWORD not generated');
        } else {
            try {
                logger.debug('OnCreate LEGACY_PASSWORD request: {}', request);
                var result = openidm.action('external/rest', 'call', request);
                logger.debug('OnCreate API call response: {}', result);

                var resultJson = JSON.parse(result);
                object.frIndexedString2 = resultJson.hash;

                // Update related params so we know what type of BCrypt hash it is
                object.frIndexedString3 = 'migrated';
                object.frIndexedString5 = 'webfiling';
            } catch (e) {
                logger.error('OnCreate LEGACY PASSWORD not generated - API call status code {}', e.javaException.getCode());
                logger.error('OnCreate LEGACY_PASSWORD error detail: {}', e);
            }
        }
        logger.info('OnCreate LEGACY_PASSWORD created!');
    }
} catch (e) {
    logger.error('OnCreate error detail: {}', e);
}

function getRandomHex(size) {
    let result = [];
    let hexRef = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];

    for (let n = 0; n < size; n++) {
        result.push(hexRef[Math.floor(Math.random() * 16)]);
    }
    return result.join('');
}