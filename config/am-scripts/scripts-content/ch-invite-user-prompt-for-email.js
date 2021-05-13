/* 
  ** INPUT DATA
    * QUERY PARAMETERS
      - companyNumber: the company number to invite users for

    * SHARED STATE:
      - '_id' : the id of the user who is invoking the journey (owner of the current session)
      - [optional] 'errorMessage': error message to display from previous attempts
 
  ** OUTPUT DATA
   
    * SHARED STATE:
      - 'companyNumber' : the company number to invite users for
      - 'email': email of the invited user
      - 'fullName': name of the invited user
      - 'errorMessage': the error message to be displayed
      - 'pagePropsJSON': the JSON props for the UI

  ** OUTCOMES
    - success: input collected
    - error: an error occurred
  
  ** CALLBACKS: 
    - input: invited full name, invited email address 
    - output: prompt to enter company no, or error message (if any)
    - output: stage name and page props for UI
*/

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.NameCallback,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
)

var NodeOutcome = {
  SUCCESS: "success",
  ERROR: "error"
}

// function extractCompanyParameter() {
//   var companyNo = requestParameters.get("companyNumber");
//   if (!companyNo) {
//     var errorMessage = "Enter a username and password.";
//     var errorProps = JSON.stringify(
//       {
//         'errors': [{
//           label: "No Company Number found in request.",
//           token: "INVITE_USER_NO_INPUT_COMPANY_FOUND_ERROR",
//           fieldName: "IDToken2",
//           anchor: "IDToken2"
//         }]
//       });

//       action = fr.Action.send(
//         new fr.TextOutputCallback(fr.TextOutputCallback.ERROR, errorMessage),
//         new fr.NameCallback("Full Name"),
//         new fr.NameCallback("Email Address"),
//         new fr.HiddenValueCallback("stage", "INVITE_USER_1"),
//         new fr.HiddenValueCallback("pagePropsJSON", errorProps)
//       ).build();

//   } else {
//     return companyNo.get(0);
//   }
// }

// main execution flow
//var companyNumber = extractCompanyParameter();
try {
  var companyData = sharedState.get("companyData");
  logger.error("[INVITE USER INPUT] company data: " + companyData);
  var companyName =  JSON.parse(companyData).name;

  if (callbacks.isEmpty()) {
    var infoMessage = "What are the details of the person you want to authorise to file for this company?";
    var errorMessage = sharedState.get("errorMessage");
    var level = fr.TextOutputCallback.INFORMATION;
    if (errorMessage != null) {
      var errorProps = sharedState.get("pagePropsJSON");
      level = fr.TextOutputCallback.ERROR;
      infoMessage = errorMessage.concat(" Please try again.");
      action = fr.Action.send(
        new fr.TextOutputCallback(level, infoMessage),
        new fr.NameCallback("Full Name"),
        new fr.NameCallback("Email Address"),
        new fr.HiddenValueCallback("stage", "INVITE_USER_1"),
        new fr.HiddenValueCallback("pagePropsJSON", errorProps)
      ).build();
    } else {
      action = fr.Action.send(
        new fr.TextOutputCallback(level, infoMessage),
        new fr.NameCallback("Full Name"),
        new fr.NameCallback("Email Address"),
        new fr.HiddenValueCallback("stage", "INVITE_USER_1")
      ).build();
    }
  } else {

    var fullName = callbacks.get(1).getName();
    var email = callbacks.get(2).getName();
    var userId = sharedState.get("_id");

    logger.error("[INVITE USER INPUT] company number: " + JSON.parse(companyData).number);
    logger.error("[INVITE USER INPUT] invited email: " + email);
    logger.error("[INVITE USER INPUT] invited full name: " + fullName);
    logger.error("[INVITE USER INPUT] inviter ID: " + userId);

    sharedState.put("email", email);
    sharedState.put("fullName", fullName);
    action = fr.Action.goTo(NodeOutcome.SUCCESS).build();
  }
} catch (e) {
  logger.error("[INVITE USER INPUT] error: " + e);
}