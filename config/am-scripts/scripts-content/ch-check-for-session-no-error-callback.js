var _scriptName = 'CH CHECK FOR SESSION - NO CALLBACKS';

/* 
  ** OUTCOMES
    - hasSession: the user has an active session
    - noSession: the user does not have an active session
*/

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
);

var NodeOutcome = {
  HAS_SESSION: 'hasSession',
  NO_SESSION: 'noSession'
};

try {
  if (_isAuthenticated()) {
    outcome = NodeOutcome.HAS_SESSION;
    _log('Has existing session', 'MESSAGE');
  } else {
    outcome = NodeOutcome.NO_SESSION;
    _log('No existing session', 'MESSAGE');
  }


  _log('[CHSLOG] requestParameters : ' + requestParameters, 'MESSAGE');

  var goto;
  var claims;
  var gotoParam = requestParameters.get("goto");
  _log('[CHSLOG] gotoParam : ' + gotoParam, 'MESSAGE');
  if (gotoParam) {
    goto = String(gotoParam.get(0));
    var vars = goto.split("&");
    for (var i=0; i<vars.length; i++) {
        var pair = vars[i].split("=");
        if(pair[0] == "claims"){
          claims = decodeURIComponent(pair[1]);}
    }

    nodeState.putShared("chsCompanyNumber", JSON.parse(claims).userinfo.company.value);
  }
} catch (e) {
  _log('error: ' + e);
  sharedState.put('errorMessage', e.toString());
}
_log('[CHSLOG] userGotoParam : ' + sharedState.get('userGotoParam'), 'MESSAGE');

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END