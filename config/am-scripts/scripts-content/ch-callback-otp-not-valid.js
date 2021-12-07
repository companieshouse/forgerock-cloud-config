var _scriptName = 'CH CALLBACK OTP NOT VALID';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action
);

try {
  // sharedState.put("pagePropsJSON", JSON.stringify(
  //     {
  //         'errors': [{
  //             label: "The OTP provided is not valid. Please try again.",
  //             token: "OTP_NOT_VALID",
  //             fieldName: "IDToken3",
  //             anchor: "IDToken3"
  //         }]
  //     }));

  transientState.put('error', 'The OTP provided is not valid. Please try again');
} catch (e) {
  _log('Error populating transient state: ' + e);
  sharedState.put('errorMessage', e.toString());
}

outcome = 'true';

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END