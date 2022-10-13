// Alpha_User On Update
require('onUpdateUser').preserveLastSync(object, oldObject, request);
newObject.mail = newObject.userName;
newObject.sn = newObject.userName;

var HASH_CONVERT_API_URL = identityServer.getProperty('esv.5759beed9b.generatehashapiurl');
var HASH_CONVERT_API_KEY = identityServer.getProperty('esv.cbd3eb4482.generatehashapikey');

try {
    let companies = newObject.memberOfOrg;
    if (companies) {
        companies.forEach((company, index) => {
            if (!company._refProperties.membershipStatus) {
                logger.error('OnUpdate - COMPANY RELATIONSHIP DOES NOT HAVE STATUS! Upgrading to CONFIRMED');
                let res = openidm.read(newObject.memberOfOrg[index]._ref, null, ['*']);
                newObject.memberOfOrg[index]._refProperties.membershipStatus = 'confirmed';
                newObject.memberOfOrg[index]._refProperties.companyLabel = res.name + ' - ' + res.number;
                newObject.memberOfOrg[index]._refProperties.adminAdded = 'true';
            }
        });
    } else {
        logger.info('OnUpdate memberOfOrg not found - skipping invite timestamp array update.');
    }

    companies = newObject.memberOfOrg;
    if (companies) {
        let newTimestamps = [];
        logger.debug('OnUpdate found companies for this user: {}', companies.length);
        companies.forEach(company => {
            if (company._refProperties.membershipStatus === 'pending') {
                newTimestamps.push(company._refProperties.inviteTimestamp);
            }
        });
        logger.info('OnUpdate found pending invites for this user: {}', newTimestamps.length);
        newObject.frIndexedMultivalued1 = newTimestamps;
    } else {
        logger.info('OnUpdate memberOfOrg not found - skipping invite timestamp array update.');
    }

    companies = newObject.memberOfOrg;
    if (companies) {
        let confirmedCompanyLabels = [];
        let pendingCompanyLabels = [];
        companies.forEach(company => {
            if (company._refProperties.membershipStatus === 'confirmed') {
                confirmedCompanyLabels.push(company._refProperties.companyLabel);
            }
            if (company._refProperties.membershipStatus === 'pending') {
                pendingCompanyLabels.push(company._refProperties.companyLabel);
            }
        });
        logger.info('OnUpdate found confirmed relationships for this user: {}', confirmedCompanyLabels.length);
        logger.info('OnUpdate found pending relationships for this user: {}', pendingCompanyLabels.length);
        newObject.frIndexedMultivalued2 = confirmedCompanyLabels;
        newObject.frIndexedMultivalued3 = pendingCompanyLabels;
    } else {
        logger.info('OnUpdate memberOfOrg not found - skipping companies array updates.');
    }
} catch (e) {
    logger.error('OnUpdate error: ' + e);
}

if (newObject.password !== oldObject.password) {
    logger.info('OnUpdate The user password has changed - LEGACY PASSWORD update started');
    var request = {
        'url': HASH_CONVERT_API_URL,
        'method': 'POST',
        'headers': {
            'Content-Type': 'application/json',
            'x-api-key': HASH_CONVERT_API_KEY
        },
        'body': '{"convert": "' + object.password + '"}'
    };

    if(!HASH_CONVERT_API_URL || !HASH_CONVERT_API_KEY){
        logger.error('OnUpdate could not find Hash Generation API details - LEGACY PASSWORD not re-generated (THE IDM and LEGACY_PWD at this point are OUT OF SYNC');
    } else {
        try {
            logger.debug('OnUpdate request: {}', request);
            var result = openidm.action('external/rest', 'call', request);
            logger.debug('OnUpdate API call response: {}', result);

            var resultJson = JSON.parse(result);
            newObject.frIndexedString2 = resultJson.hash;

            // Update related params so we know what type of BCrypt hash it is
            newObject.frIndexedString3 = 'migrated';
            newObject.frIndexedString5 = 'webfiling';
        } catch (e) {
            logger.error('OnUpdate LEGACY PASSWORD not re-generated - API call status code {}', e.javaException.getCode());
            logger.error('OnUpdate Error Detail: {}', e);
        }
        logger.info('OnUpdate LEGACY_PASSWORD updated!');
    }
}
