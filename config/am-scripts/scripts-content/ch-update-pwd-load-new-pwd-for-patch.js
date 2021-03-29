var password = transientState.get("newPassword");
logger.error("[CHANGE PWD - LOAD NEW PWD FOR PATCH] new password: "+password);
transientState.put("objectAttributes",{"password":password});
outcome = "true";