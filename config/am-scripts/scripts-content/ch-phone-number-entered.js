var phone = sharedState.get("objectAttributes").get("telephoneNumber");
// NB: UNCOMMENT WHEN ENABLING MFA ON REGISTRATION
  // if (phone) {
  //   transientState.put("registrationMFA", true);
  //   outcome = "true";
  // } else {
  //   outcome = "false";
  // }
outcome = "false"