function isActive (startDate, expiryDate) {
  const unixNow = Date.parse(new Date());
  
  try {
    if (startDate && expiryDate) {

      var parsedStart = new Date(startDate.substring(0, 10));
      var unixStart = Date.parse(parsedStart);

      var parsedExpiry = new Date(expiryDate.substring(0, 10));
      var unixExpiry = Date.parse(parsedExpiry);

      if ((unixNow >= unixStart) && (unixNow < unixExpiry)) {
    
        return true;
      } else {
      
        return false;
      }
    } else if (startDate && !expiryDate) {
     

      var parsedStart = new Date(startDate.substring(0, 10));
      var unixStart = Date.parse(parsedStart);

      if (unixNow >= unixStart) {
       
        return true;
      } else {
      
        return false;
      }
    } else {
    
      
      return true;
    }
  } catch (e) {
    logger.error('[AUTHCODE_DATE_CHECK] An error occurred ' + e);
    return true;
  }
}

isActive(source.STARTDTE, source.EXPIRYDTE);
