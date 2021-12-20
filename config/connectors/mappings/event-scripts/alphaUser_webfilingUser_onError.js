// alphaUser_webfilingUser On Error
logger.error('[CH-SYNC] Sync of alphaUser_webfilingUser with sourceId: ' + sourceId + ' failed with error: ' + error)
try {
    logger.error('Sync alphaUser_webfilingUser - error: ' + JSON.stringify(target))
} catch (e) {
    logger.error('Error' + e);
}