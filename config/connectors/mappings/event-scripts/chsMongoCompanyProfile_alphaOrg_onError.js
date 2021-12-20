// chsMongoCompanyProfile_alphaOrg On Error
logger.error('Sync of chsMongoCompanyProfile_alphaOrg with sourceId: ' + sourceId + ' failed with error: ' + error)
logger.error('Source object: ' + JSON.stringify(source))
try {
    logger.error('Sync chsMongoCompanyProfile_alphaOrg - error: ' + JSON.stringify(target))
} catch (e) {
    logger.error('Error' + e);
}