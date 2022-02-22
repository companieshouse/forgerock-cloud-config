var _scriptName = 'CH JOIN COMPANY CONFIRMATION';
_log('Starting');

/* 
  ** INPUT DATA
    * SHARED STATE:
      - 'companyData' : the result of the company lookup by ID
      
  ** OUTCOMES
    - true: confirmation ok
  
  ** CALLBACKS: 
    - info: user has been associated to company
*/

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
);

var NodeOutcome = {
  SUCCESS: 'true'
};

var companyData = sharedState.get('companyData');
// _log('company data: ' + companyData);
var infoMessage = 'The company has been added to your account';

if (callbacks.isEmpty()) {
  action = fr.Action.send(
    new fr.TextOutputCallback(
      fr.TextOutputCallback.INFORMATION,
      infoMessage
    ),
    new fr.HiddenValueCallback(
      'stage',
      'COMPANY_ASSOCIATION_4'
    ),
    new fr.HiddenValueCallback(
      'pagePropsJSON',
      JSON.stringify({
        'company': {
          name: JSON.parse(companyData).name
        }
      })
    )
  ).build();
} else {
  action = fr.Action.goTo(NodeOutcome.SUCCESS).build();
}

// LIBRARY START
// LIBRARY END