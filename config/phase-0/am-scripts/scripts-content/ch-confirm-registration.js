var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  java.lang.Math,
  java.lang.String,
  org.forgerock.openam.auth.node.api,
  com.sun.identity.authentication.callbacks.ScriptTextOutputCallback,
  javax.security.auth.callback.TextOutputCallback,
  org.forgerock.json.jose.builders.JwtBuilderFactory,
  org.forgerock.json.jose.jws.handlers.HmacSigningHandler,
  org.forgerock.json.jose.jwt.JwtClaimsSet,
  org.forgerock.json.jose.jws.JwsAlgorithm,
  org.forgerock.json.jose.jws.SignedJwt,
  org.forgerock.json.jose.jws.JwsHeader,
  org.forgerock.json.jose.jwt.Payload,  
  javax.security.auth.callback.PasswordCallback 
)

var Difference_In_Time;
var errorFound = false;
var referer = requestHeaders.get("referer").get(0);
logger.error("referrer: " + referer);
// Parse the referer to get the username and token query parameters 
var params = {};
var vars = referer.split('&');
for (var i = 0; i < vars.length; i++) {
  var pair = vars[i].split('=');
  params[pair[0]] = decodeURIComponent(pair[1]);
}
var tokenURL = params.token;
logger.error("received token: " + tokenURL);

try{

  // TODO: TOKEN VERIFICATION
  // see https://git.openam.org.ru/org.forgerock/org.forgerock.openam/blob/6d8bd7c079ed52aaefecb12e1b233ea697431a96/openam/openam-core-rest/src/main/java/org/forgerock/openam/core/rest/authn/AuthIdHelper.java
  //  String keyAlias = getKeyAlias(realmDN);
  //  PublicKey publicKey = amKeyProvider.getPublicKey(keyAlias);
  //  SigningHandler signingHandler = signingManager.newHmacSigningHandler(publicKey.getEncoded());
  //  var verified = signedJwt.verify(signingHandler)

  // TODO: TOKEN DECRYPTION
  
  // reconstruct the inbound token, extract the originating email and creation date
  var signedJwt = new fr.JwtBuilderFactory().reconstruct(tokenURL, fr.SignedJwt);
  var claimSet = signedJwt.getClaimsSet();
  var email = claimSet.getSubject();
  var iat = claimSet.getClaim("creationDate");
  var firstName = claimSet.getClaim("firstName");
  var lastName = claimSet.getClaim("lastName");
  var now = new Date();
  var Difference_In_Time = now.getTime() - (new Date(iat)).getTime();
  logger.error("initiating email: " + email + " on: "+ iat + " - difference (min): "+Math.round(Difference_In_Time/(1000 * 60)));
  logger.error("name: " + firstName + " - surname: "+lastName);
}catch(e){
  logger.error("error while reconstructing JWT: " + e);
  errorFound = true;	
}

if(errorFound){
  if (callbacks.isEmpty()) {
    action = fr.Action.send(
        new fr.TextOutputCallback(
            fr.TextOutputCallback.ERROR,
            "Error While parsing token"
        )
    ).build()
  }
} else if (Math.round(Difference_In_Time/(1000 * 60)) < 10080){
  logger.error("token is still valid");
  try{
    // put the read attributes in shared state for the Create Object node to consume
    sharedState.put("objectAttributes", {"userName":email, "givenName":firstName, "sn":lastName, "mail":email});
    sharedState.put("userName", email);
  }catch(e){
    logger.error("error while storing state: " + e);
    errorFound = true;
  }
  outcome = errorFound ? "false" : "true" 
} else {
  if (callbacks.isEmpty()) {
    action = fr.Action.send(
        new fr.TextOutputCallback(
            fr.TextOutputCallback.ERROR,
            "The provided token is expired"
        )
    ).build()
  }
}