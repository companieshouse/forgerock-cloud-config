// webfilingAuthCode_alphaOrg On Error
logger.error('[CH-SYNC][AUTHCODE-TO-ALPHA-ORG][ERROR] Sync of webfilingAuthCode_alphaOrg with sourceId: ' + sourceId + ' failed with error: ' + error)
logger.error('[CH-SYNC][AUTHCODE-TO-ALPHA-ORG][ERROR] Source object: ' + JSON.stringify(source))
try {
    logger.error('[CH-SYNC][AUTHCODE-TO-ALPHA-ORG][ERROR] Sync webfilingAuthCode_alphaOrg - error: ' + JSON.stringify(target))
} catch (e) {
    logger.error('[CH-SYNC][AUTHCODE-TO-ALPHA-ORG][ERROR] Error' + e);
}