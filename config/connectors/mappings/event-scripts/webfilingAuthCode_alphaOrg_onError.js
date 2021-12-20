// webfilingAuthCode_alphaOrg On Error
logger.error('Sync of webfilingAuthCode_alphaOrg with sourceId: ' + sourceId + ' failed with error: ' + error)
logger.error('Source object: ' + JSON.stringify(source))
try {
    logger.error('Sync webfilingAuthCode_alphaOrg - error: ' + JSON.stringify(target))
} catch (e) {
    logger.error('Error' + e);
}