var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    java.lang.Math,
    java.lang.String,
    org.forgerock.openam.auth.node.api,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback,
    org.forgerock.json.jose.builders.JwtBuilderFactory,
    org.forgerock.json.jose.jws.handlers.HmacSigningHandler,
    org.forgerock.json.jose.jwt.JwtClaimsSet,
    org.forgerock.json.jose.jws.JwsAlgorithm,
    org.forgerock.json.jose.jws.SignedJwt,
    org.forgerock.json.jose.jws.JwsHeader
  )
  
  var differenceInTime;
  var errorFound = false;
  var tokenURL;

  var tokenURLParam = requestParameters.get("token");
  if (tokenURLParam) { 
    tokenURL = requestParameters.get("token").get(0);
    logger.error("[RESET PWD] token found: " + tokenURL);
    logger.error("[RESET PWD] Resuming pwd reset journey!");
  
    try{
        var signedJwt = new fr.JwtBuilderFactory().reconstruct(tokenURL, fr.SignedJwt);
        var claimSet = signedJwt.getClaimsSet();
        var email = claimSet.getSubject();
        var iat = claimSet.getClaim("creationDate");
        var now = new Date();
        var differenceInTime = now.getTime() - (new Date(iat)).getTime();
        logger.error("[RESET PWD] initiating email: " + email + " on: "+ iat + " - difference (hours): "+Math.round(differenceInTime/(1000 * 60)/60));
    }catch(e){
      logger.error("[RESET PWD] error while reconstructing JWT: " + e);
      errorFound = true;	
    }
    
    if(errorFound){
      if (callbacks.isEmpty()) {
        action = fr.Action.send(
            new fr.HiddenValueCallback (
                "stage",
                "RESET_PASSWORD_ERROR" 
            ),
            new fr.TextOutputCallback(
                fr.TextOutputCallback.ERROR,
                "Error While parsing token"
            ),
            new fr.HiddenValueCallback (
                "pagePropsJSON",
                JSON.stringify({ 'errors': [{ label: "An error occurred while parsing the token" }] })
            )
        ).build()
      }
    } else if (Math.round(differenceInTime/(1000 * 60)) < 1440){
      logger.error("The provided token is still valid");
      try{
        // put the read attributes in shared state for the Create Object node to consume
        sharedState.put("objectAttributes", {"userName":email, "mail":email});
        sharedState.put("userName", email);
      }catch(e){
        logger.error("[RESET PWD] error while storing state: " + e);
        errorFound = true;
      }
      outcome = errorFound ? "false" : "true" 
    } else if (callbacks.isEmpty()) {
        action = fr.Action.send(
            new fr.HiddenValueCallback (
                "stage",
                "RESET_PASSWORD_ERROR" 
            ),
            new fr.HiddenValueCallback (
                "pagePropsJSON",
                JSON.stringify({ 'errors': [{ label: "The password reset token has expired" }] })
            ),
            new fr.TextOutputCallback(
              fr.TextOutputCallback.ERROR,
              "The password reset token has expired"
            )
          ).build()
    }
    outcome = "resume"
  }else{ 
    logger.error("[RESET PWD] token not found: starting pwd reset journey");
    outcome = "start"
  }