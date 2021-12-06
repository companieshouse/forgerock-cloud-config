function isActive (startDate, expiryDate) {
  const unixNow = Date.parse(new Date());
  logger.error('[AUTHCODE_DATE_CHECK] unix now ==> ' + unixNow);

  try {
    if (startDate && expiryDate) {
      logger.error('[AUTHCODE_DATE_CHECK] both dates present');
      logger.error('[AUTHCODE_DATE_CHECK] start date ==> ' + startDate);
      logger.error('[AUTHCODE_DATE_CHECK] expiry date ==> ' + expiryDate);

      var parsedStart = new Date(startDate.substring(0, 10));
      var unixStart = Date.parse(parsedStart);
      logger.error('[AUTHCODE_DATE_CHECK] unix start date ==> ' + unixStart);

      var parsedExpiry = new Date(expiryDate.substring(0, 10));
      var unixExpiry = Date.parse(parsedExpiry);
      logger.error('[AUTHCODE_DATE_CHECK] unix expiry date ==> ' + unixExpiry);

      if ((unixNow >= unixStart) && (unixNow < unixExpiry)) {
        logger.error('[AUTHCODE_DATE_CHECK] currently within dates - ACTIVE');
        return true;
      } else {
        logger.error('[AUTHCODE_DATE_CHECK] currently outside dates - INACTIVE');
        return false;
      }
    } else if (startDate && !expiryDate) {
      logger.error('[AUTHCODE_DATE_CHECK] start date present');

      var parsedStart = new Date(startDate.substring(0, 10));
      var unixStart = Date.parse(parsedStart);
      logger.error('[AUTHCODE_DATE_CHECK] unix start date ==> ' + unixStart);

      if (unixNow >= unixStart) {
        logger.error('[AUTHCODE_DATE_CHECK] currently after start date - ACTIVE');
        return true;
      } else {
        logger.error('[AUTHCODE_DATE_CHECK] currently before start date - INACTIVE');
        return false;
      }
    } else {
      logger.error('[AUTHCODE_DATE_CHECK] no auth code dates present - default to ACTIVE');
      return true;
    }
  } catch (e) {
    logger.error('[AUTHCODE_DATE_CHECK] An error occurred ' + e);
    return true;
  }
}

isActive(source.STARTDTE, source.EXPIRYDTE);
