var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  java.lang.Math,
  java.lang.String,
  org.forgerock.openam.auth.node.api,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback,
  org.forgerock.json.jose.builders.JwtBuilderFactory,
  org.forgerock.json.jose.jwt.JwtClaimsSet,
  org.forgerock.json.jose.jws.JwsAlgorithm,
  org.forgerock.json.jose.jws.SignedJwt,
  org.forgerock.json.jose.jws.JwsHeader
)

var NodeOutcome = {
  SUCCESS: "true",
  ERROR: "false"
}

function extractTokenParameter(){
  var tokenURLParam = requestParameters.get("token");
  if (!tokenURLParam) { 
    if (callbacks.isEmpty()) {
      action = fr.Action.send(
          new fr.HiddenValueCallback (
            "stage",
            "REGISTRATION_ERROR" 
          ),
          new fr.HiddenValueCallback (
            "pagePropsJSON",
            JSON.stringify({ 'errors': [{ 
              label: "No Registration Token found in request.", 
              token: "REGISTRATION_NO_TOKEN_ERROR" 
            }] })
          ),
          new fr.TextOutputCallback(
            fr.TextOutputCallback.ERROR,
            "Token parameter not found"
          )
      ).build();
      return false;
    }
  }else{
    return tokenURLParam.get(0);
  }
}

function extractInfoFromToken(tokenURL){
  //tokenURL = requestParameters.get("token").get(0);
  logger.error("[REGISTRATION-RESUME] received token: " + tokenURL);
  // TODO: TOKEN DECRYPTION
  try{
    // reconstruct the inbound token, extract the originating email and creation date
    var signedJwt = new fr.JwtBuilderFactory().reconstruct(tokenURL, fr.SignedJwt);
    var claimSet = signedJwt.getClaimsSet();
    var email = claimSet.getSubject();
    var iat = claimSet.getClaim("creationDate");
    var fullName = claimSet.getClaim("fullName");
    var phone = claimSet.getClaim("phone");
    var now = new Date();
    differenceInTime = now.getTime() - (new Date(iat)).getTime();
    logger.error("[REGISTRATION-RESUME] initiating email: " + email + " on: "+ iat + " - difference (hours): "+Math.round(differenceInTime/(1000 * 60)/60));
    logger.error("[REGISTRATION-RESUME] name: " + fullName);
    logger.error("[REGISTRATION-RESUME] phone: " + phone);
    return {
      email: email,
      fullName: fullName,
      phone: phone,
      differenceInTime: differenceInTime
    }
  }catch(e){
    logger.error("[REGISTRATION-RESUME] error while reconstructing JWT: " + e);
    return false;	
  }
}

function raiseTokenExpiredError(){
  if (callbacks.isEmpty()) {
    action = fr.Action.send(
      new fr.HiddenValueCallback (
            "stage",
            "REGISTRATION_ERROR" 
      ),
      new fr.HiddenValueCallback (
        "pagePropsJSON",
        JSON.stringify({ 'errors': [{ 
          label: "The registration token has expired. Please restart the registration process.", 
          token: "REGISTRATION_TOKEN_EXPIRED_ERROR" 
        }] })
      ),
      new fr.TextOutputCallback(
        fr.TextOutputCallback.ERROR,
        "The registration token has expired"
      )
    ).build()
  }
}

function saveUserDataToState(tokenData){
  logger.error("[REGISTRATION-RESUME] The provided token is still valid");
  try{
    // put the read attributes in shared state for the Create Object node to consume
    sharedState.put("objectAttributes", 
      {
        "userName": tokenData.email, 
        "givenName": tokenData.fullName, 
        "sn": tokenData.email, 
        "mail": tokenData.email, 
        "telephoneNumber": tokenData.phone
      });
    sharedState.put("userName", tokenData.email);
    return NodeOutcome.SUCCESS;
  }catch(e){
    logger.error("[REGISTRATION-RESUME] error while storing state: " + e);
    return NodeOutcome.ERROR;
  }
}

//main execution flow

var token = extractTokenParameter();

if(token) {
  // TODO: TOKEN VERIFICATION
  // see https://git.openam.org.ru/org.forgerock/org.forgerock.openam/blob/6d8bd7c079ed52aaefecb12e1b233ea697431a96/openam/openam-core-rest/src/main/java/org/forgerock/openam/core/rest/authn/AuthIdHelper.java
  //  String keyAlias = getKeyAlias(realmDN);
  //  PublicKey publicKey = amKeyProvider.getPublicKey(keyAlias);
  //  SigningHandler signingHandler = signingManager.newHmacSigningHandler(publicKey.getEncoded());
  //  var verified = signedJwt.verify(signingHandler)
  var tokenData = extractInfoFromToken(token);

  if(!tokenData){
    if (callbacks.isEmpty()) {
      action = fr.Action.send(
        new fr.TextOutputCallback(
            fr.TextOutputCallback.ERROR,
            "Error While parsing token"
        ),
        new fr.HiddenValueCallback (
          "stage",
          "REGISTRATION_ERROR" 
        ),
        
        new fr.HiddenValueCallback (
          "pagePropsJSON",
          JSON.stringify({ 'errors': [{ 
            label: "An error occurred while parsing the registration token. Please restart the registration process", 
            token: "REGISTRATION_TOKEN_PARSING_ERROR"
          }] })
        )
      ).build()
    }
  } else if (Math.round(tokenData.differenceInTime/(1000 * 60)) < 1440){
    outcome = saveUserDataToState(tokenData); 
  } else {
    raiseTokenExpiredError();
  }
}