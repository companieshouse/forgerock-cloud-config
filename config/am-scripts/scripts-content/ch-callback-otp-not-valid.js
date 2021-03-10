var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action
)

try{
  transientState.put("error", "The OTP provided is not valid. Please try again");
}catch(e){
  logger.error("[RESET PWD] Error populating transient state: "+ e);
}

outcome = "true";