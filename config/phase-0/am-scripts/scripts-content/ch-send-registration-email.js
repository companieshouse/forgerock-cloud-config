var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    com.sun.identity.authentication.callbacks.HiddenValueCallback,
    com.sun.identity.authentication.callbacks.ScriptTextOutputCallback,
    com.sun.identity.idm.IdUtils
)
var lang = java.lang 
try{
  var x = new lang.Integer(55); 
  logger.error("number:  "+x);
  logger.error("hex:  "+lang.Integer.toHexString(x));
  
} catch (e) {
    logger.error("Exception: " + e)
}

var username = "user.0"
var realm = "/"
try {
    var id = fr.IdUtils.getIdentity(username, realm)
} catch (e) {
   logger.error(e)
}

try{
    var currentTimestamp = Math.floor(Date.now() / 1000)
    logger.error("time: " + currentTimestamp)
} catch (e) {
    logger.error("Exception: " + e)
}
    
  var issUuid="5b26dfa0-9729-472f-bc67-875148ace8b6";
  var secretKeyUuid="e09ea8c2-f51b-4a54-8b31-81093173d0fc";
  
  var smsTemplateId="df34455a-a720-4108-a6f6-b874e89a4320";
  var smsTemplateId="cbc9edea-2041-4117-a2b3-4052b0d3f01b";
  
  var baseUrl = "https://api.notifications.service.gov.uk";
  
  
  try{
    // Prepare timestamp in seconds
    var currentTimestamp = Math.floor(Date.now() / 1000)
  
    var header = {
      'typ': 'JWT',
      'alg': 'HS256'
    };
  
    var data = {
      'iss': issUuid || '',
      'iat': currentTimestamp,
    }
    logger.error("Data: " + JSON.stringify(data));
    logger.error("Header: " + JSON.stringify(header));
  } catch (e) {
      logger.error("Exception: " + e)
  }
  
  function base64url(source) {
      // Encode in classical base64
      encodedSource = CryptoJS.enc.Base64.stringify(source)
      
      // Remove padding equal characters
      encodedSource = encodedSource.replace(/=+$/, '')
      
      // Replace characters according to base64url specifications
      encodedSource = encodedSource.replace(/\+/g, '-')
      encodedSource = encodedSource.replace(/\//g, '_')
      
      return encodedSource
  }
  
  
  var request = new org.forgerock.http.protocol.Request()
  request.setUri("http://api.ipify.org/") // Timeout the request.
  request.setMethod("GET")
  
  try {
      var response = httpClient.send(request).get()
  } catch (e) {
      logger.error("Exception: " + e)
  }
  
  if (!response) {
      logger.error("No response.")
  } else if (response.getStatus().getCode() == 200) {
      logger.error("Response: " + response.getEntity().getString())
  } else {
      logger.error("Response code: " + response.getStatus().getCode())
  }
  outcome="true"