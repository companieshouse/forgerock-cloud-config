var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action, 
  javax.security.auth.callback.PasswordCallback, 
  javax.security.auth.callback.NameCallback,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback,
  java.lang.String 
)

var NodeOutcome = {
  SUCCESS: "success",
  FAIL: "fail"
}

function isMobile(number) {
  var mobileValid = /^((0044|0|\+44)7\d{3}\s?\d{6})$/.test(number);
  if (mobileValid) {
      return true;
  }
  return false;
}

var PHONE_NUMBER_FIELD = "telephoneNumber";

var debug = String("Shared state: " + sharedState.toString() + "\\n");
logger.error("[UPDATE PHONE SHOW NUMBER] Shared state: " + debug);

var debug2 = String("Shared state: " + transientState.toString() + "\\n");
logger.error("[UPDATE PHONE SHOW NUMBER] Transient state: " + debug2);

if (callbacks.isEmpty()) {
  var infoMessage = "Please enter your new phone number. Enter your password to make this change";
  var level = fr.TextOutputCallback.INFORMATION;

  var userId = sharedState.get("_id");
  logger.error("[UPDATE PHONE SHOW NUMBER] userId: " + userId);

  var currentNumberMessage = "You do not have a phone number stored in your Companies House account. ";
  if (idRepository.getAttribute(userId, PHONE_NUMBER_FIELD).iterator().hasNext()) {
    var currentPhoneNumber = idRepository.getAttribute(userId, PHONE_NUMBER_FIELD).iterator().next();
    logger.error("[UPDATE PHONE SHOW NUMBER] Found currentPhoneNumber: " + currentPhoneNumber);
    if (currentPhoneNumber) {
      transientState.put("currentPhoneNumber", currentPhoneNumber);
      infoMessage = "The phone number currently stored in your Companies House account is "
        .concat(currentPhoneNumber).concat(". ")
        .concat(infoMessage);
    } else {
      infoMessage = currentNumberMessage.concat(infoMessage);
    }
  }

  var errorMessage = sharedState.get("errorMessage");
  var errorType, errorField;
  if (errorMessage !== null) {
    var errorProps = sharedState.get("pagePropsJSON");
    level = fr.TextOutputCallback.ERROR;
    infoMessage = errorMessage.concat(" Please try again.");
    action = fr.Action.send(
      fr.TextOutputCallback(level, infoMessage),
      fr.NameCallback("Enter new phone number"),
      fr.PasswordCallback("Enter your password", false),
      fr.HiddenValueCallback("stage", "UPDATE_PHONE_1"),
      fr.HiddenValueCallback("pagePropsJSON",  errorProps)
    ).build();
  } else {
    action = fr.Action.send(
      fr.TextOutputCallback(level, infoMessage),
      fr.NameCallback("Enter new phone number"),
      fr.PasswordCallback("Enter your password", false),
      fr.HiddenValueCallback("stage", "UPDATE_PHONE_1")
    ).build();
  }
} else {
  var newPhoneNumber = callbacks.get(1).getName();
  var currentPassword = fr.String(callbacks.get(2).getPassword());

  logger.error("[UPDATE PHONE] New phone number " + newPhoneNumber);
  if (!newPhoneNumber || !currentPassword) {
      sharedState.put("errorMessage", "Invalid credential(s) entered.");
      sharedState.put("pagePropsJSON", JSON.stringify(
        {
            'errors': [{
                label: "Invalid credential entered.",
                token: "UPDATE_PHONE_INVALID_CREDENTIALS",
                fieldName: "IDToken1",
                anchor: "IDToken1"
            }]
        }));
      logger.error("[UPDATE PHONE] FAILED" + currentPassword);
      action = fr.Action.goTo(NodeOutcome.FAIL).build();
  } else if (!isMobile(newPhoneNumber)) {
      sharedState.put("errorMessage", "Invalid mobile number entered.");
      sharedState.put("pagePropsJSON", JSON.stringify(
        {
            'errors': [{
                label: "Invalid mobile number entered",
                token: "UPDATE_PHONE_INVALID_MOBILE_NUMBER",
                fieldName: "IDToken2",
                anchor: "IDToken2"
            }]
        }));
      logger.error("[UPDATE PHONE] FAILED" + currentPassword);
      action = fr.Action.goTo(NodeOutcome.FAIL).build();
  } else {
      logger.error("[UPDATE PHONE] SUCCESS");
      sharedState.put("objectAttributes", 
      {
        "telephoneNumber": newPhoneNumber
      });
      transientState.put("updatePhoneNumber", true);
      transientState.put("password", currentPassword);
      action = fr.Action.goTo(NodeOutcome.SUCCESS).build();
  }        
}