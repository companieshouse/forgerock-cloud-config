var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action, 
    javax.security.auth.callback.PasswordCallback, 
    javax.security.auth.callback.TextOutputCallback,
    java.lang.String 
)

var NodeOutcome = {
  SUCCESS: "success",
  MISMATCH: "mismatch"
}

if (callbacks.isEmpty()) { 
    var infoMessage = "Please enter your current password, together with your new password (and confirmation)"
    var level = fr.TextOutputCallback.INFORMATION
    var errorMessage = sharedState.get("errorMessage")
    if (errorMessage != null) {
      level = fr.TextOutputCallback.ERROR
      infoMessage = errorMessage.concat(" Please try again.")
    }
    action = fr.Action.send(
        fr.TextOutputCallback(level, infoMessage),
        fr.PasswordCallback("Current password", false),
        fr.PasswordCallback("New password", false),
        fr.PasswordCallback("Confirm new password", false),
        fr.HiddenValueCallback ("stage", "CHANGE_PASSWORD_1")
    ).build()
} else {
    var password = fr.String(callbacks.get(1).getPassword())
    var newPassword = fr.String(callbacks.get(2).getPassword())
    var confirmNewPassword = fr.String(callbacks.get(3).getPassword())
    if (!confirmNewPassword.equals(newPassword)) {
        sharedState.put("errorMessage", "The new password and confirmation do not match.")
        action = fr.Action.goTo(NodeOutcome.MISMATCH).build()
    }
    else {
        transientState.put("password", password)
        transientState.put("newPassword", newPassword)
        action = fr.Action.goTo(NodeOutcome.SUCCESS).build()
    }
             
}