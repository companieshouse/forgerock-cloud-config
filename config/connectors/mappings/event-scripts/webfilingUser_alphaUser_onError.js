// webfilingUser_alphaUser On Error
logger.error('[CH-SYNC][EWF-TO-ALPHA-USER][ERROR] Sync of webfilingUser_alphaUser with sourceId: ' + sourceId + ' failed with error: ' + error)
logger.debug('[CH-SYNC][EWF-TO-ALPHA-USER][ERROR] Source object: ' + JSON.stringify(source))
try {
    logger.debug('[CH-SYNC][EWF-TO-ALPHA-USER][ERROR] Sync webfilingUser_alphaUser - error: ' + JSON.stringify(target))
} catch (e) {
    logger.error('[CH-SYNC][EWF-TO-ALPHA-USER][ERROR] Error' + e);
}