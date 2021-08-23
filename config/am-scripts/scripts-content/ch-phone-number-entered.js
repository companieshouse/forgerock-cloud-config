var phone = sharedState.get("objectAttributes").get("telephoneNumber");
if (phone) {
  sharedState.put("registrationMFA", true);
  sharedState.put("mfa-route", "sms");
  outcome = "true";
} else {
  sharedState.put("mfa-route", "email");
  outcome = "false";
}