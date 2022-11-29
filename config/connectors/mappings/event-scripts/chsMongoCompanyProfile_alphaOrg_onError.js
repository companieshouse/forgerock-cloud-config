// chsMongoCompanyProfile_alphaOrg On Error
logger.error('[CH-SYNC][MONGO-COMPANY-TO-ALPHA-ORG][ERROR] Sync of chsMongoCompanyProfile_alphaOrg with sourceId: ' + sourceId + ' failed with error: ' + error)
logger.debug('[CH-SYNC][MONGO-COMPANY-TO-ALPHA-ORG][ERROR] Source object: ' + JSON.stringify(source))
try {
    logger.debug('[CH-SYNC][MONGO-COMPANY-TO-ALPHA-ORG][ERROR] Sync chsMongoCompanyProfile_alphaOrg - error: ' + JSON.stringify(target))
} catch (e) {
    logger.error('[CH-SYNC][MONGO-COMPANY-TO-ALPHA-ORG][ERROR] Error' + e);
}