var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
)

var NodeOutcome = {
  SUCCESS: "success",
  ERROR: "error"
}

var companyData = sharedState.get("companyData");
var inviterUserId = sharedState.get("_id");
var invitedEmail = sharedState.get("email");
var inviterName = sharedState.get("inviterName");

var ONBOARDING_DATE_FIELD = "fr-attr-idate2";

function formatDate() {
  var date = new Date();
  var result = [];
  result.push(date.getFullYear());
  result.push(padding(date.getMonth() + 1));
  result.push(padding(date.getDate()));
  result.push(padding(date.getHours()));
  result.push(padding(date.getMinutes()));
  result.push(padding(date.getSeconds()));
  result.push("Z");
  return result.join('');
}

function padding(num) {
  return num < 10 ? '0' + num : num;
}

// prepares the payload for 'Create Object' node in case the user with given email does not exist
function saveUserDataToState(invitedEmail, onboardingDate) {
  try {
    // put the read attributes in shared state for the Create Object node to consume
    sharedState.put("objectAttributes",
      {
        "userName": invitedEmail,
        "sn": invitedEmail,
        "mail": invitedEmail,
        "frIndexedDate2": onboardingDate
      });
    sharedState.put("userName", invitedEmail);
    return NodeOutcome.SUCCESS;
  } catch (e) {
    logger.error("[INVITE USER - CREATE NEW USER] error while storing new user data: " + e);
    return NodeOutcome.ERROR;
  }
}

//main execution flow
try {
  var onboardingDate = formatDate();
  logger.error("[INVITE USER - CREATE NEW USER] Setting onboarding date to " + onboardingDate);
  outcome = saveUserDataToState(invitedEmail, onboardingDate);
} catch (e) {
  logger.error(e)
}
