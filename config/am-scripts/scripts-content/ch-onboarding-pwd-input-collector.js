var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.PasswordCallback,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback,
  java.lang.String
)

var NodeOutcome = {
  SUCCESS: "success",
  MISMATCH: "mismatch"
}

if (callbacks.isEmpty()) {
  var infoMessage = "Please create new password for user ".concat(sharedState.get("userName"));
  var level = fr.TextOutputCallback.INFORMATION;
  var errorMessage = sharedState.get("errorMessage");
  var userName = sharedState.get("userName");
  if (errorMessage !== null) {
    var errorProps = sharedState.get("pagePropsJSON");
    level = fr.TextOutputCallback.ERROR;
    infoMessage = errorMessage.concat(" Please try again.");
    action = fr.Action.send(
      fr.TextOutputCallback(level, infoMessage),
      fr.HiddenValueCallback("userName", userName),
      fr.PasswordCallback("New password", false),
      fr.PasswordCallback("Confirm new password", false),
      fr.HiddenValueCallback("stage", "ONBOARDING_PWD"),
      fr.HiddenValueCallback("pagePropsJSON", errorProps)
    ).build();
  } else {
    action = fr.Action.send(
      fr.TextOutputCallback(level, infoMessage),
      fr.HiddenValueCallback("userName", userName),
      fr.PasswordCallback("New password", false),
      fr.PasswordCallback("Confirm new password", false),
      fr.HiddenValueCallback("stage", "ONBOARDING_PWD")
    ).build();
  }
} else {
  var newPassword = fr.String(callbacks.get(2).getPassword());
  var confirmNewPassword = fr.String(callbacks.get(3).getPassword());
  if (!confirmNewPassword.equals(newPassword)) {
    sharedState.put("errorMessage", "The new password and confirmation do not match.");
    sharedState.put("pagePropsJSON", JSON.stringify(
      {
        'errors': [{
          label: "The new password and confirmation do not match.",
          token: "PWD_MISMATCH",
          fieldName: "IDToken3",
          anchor: "IDToken3"
        }]
      }));
    action = fr.Action.goTo(NodeOutcome.MISMATCH).build();
  }
  else {
    transientState.put("newPassword", newPassword);
    action = fr.Action.goTo(NodeOutcome.SUCCESS).build();
  }
}