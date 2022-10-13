var _scriptName = 'CH CALLBACK PROMPT FOR COMPANY INFO';
_log('Starting');

/* 
  ** OUTPUT DATA
    * SHARED STATE:
      - 'credential' : the company auth code entered by the user
      - 'companyNumber' : the company number entered by the user
       
  ** OUTCOMES
    - true: input collected
  
  ** CALLBACKS: 
    - input: company auth code
    - input: company number
*/

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.NameCallback
);

if (callbacks.isEmpty()) {
  action = fr.Action.send(
    new fr.NameCallback('Enter Auth Code'),
    new fr.NameCallback('Enter Company number')
  ).build();
} else {
  var credential = callbacks.get(0).getName();
  var companyNumber = callbacks.get(1).getName();

  // _log('Credential: ' + credential);
  _log('CompanyNumber: ' + companyNumber);

  sharedState.put('credential', credential);
  sharedState.put('companyNumber', companyNumber);
  action = fr.Action.goTo('true').build();
}

// LIBRARY START
// LIBRARY END