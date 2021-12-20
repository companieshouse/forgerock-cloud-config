// webfilingUser_alphaUser On Error
logger.error('Sync of webfilingUser_alphaUser with sourceId: ' + sourceId + ' failed with error: ' + error)
logger.error('Source object: ' + JSON.stringify(source))
try {
    logger.error('Sync webfilingUser_alphaUser - error: ' + JSON.stringify(target))
} catch (e) {
    logger.error('Error' + e);
}