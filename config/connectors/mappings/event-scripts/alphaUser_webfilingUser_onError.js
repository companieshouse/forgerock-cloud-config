// alphaUser_webfilingUser On Error
logger.error('[CH-SYNC][ALPHA-USER-TO-EWF][ERROR] Sync of alphaUser_webfilingUser with sourceId: ' + sourceId + ' failed with error: ' + error)
try {
    logger.error('[CH-SYNC][ALPHA-USER-TO-EWF][ERROR] Sync alphaUser_webfilingUser - error: ' + JSON.stringify(target))
} catch (e) {
    logger.error('[CH-SYNC][ALPHA-USER-TO-EWF][ERROR] Error' + e);
}