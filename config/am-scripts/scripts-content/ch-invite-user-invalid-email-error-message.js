sharedState.put("errorMessage", "Invalid email address.");
sharedState.put("pagePropsJSON", JSON.stringify(
  {
    'errors': [{
      label: "Invalid email address.",
      token: "INVITE_USER_INVALID_EMAIL_ERROR",
      fieldName: "IDToken2",
      anchor: "IDToken2"
    }]
  }));

outcome = "true";