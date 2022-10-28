var _scriptName = 'CH CONFIRM REGISTRATION CHOICES';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback,
  javax.security.auth.callback.ConfirmationCallback
);

var NodeOutcome = {
  CHANGE: 'change',
  CONTINUE: 'continue'
};

var CONTINUE_OPTION_INDEX = 0;

var objectAttributes = sharedState.get('objectAttributes');

 if (callbacks.isEmpty()) {
          action = fr.Action.send(
            new fr.HiddenValueCallback(
              'stage', 'REGISTRATION_CONFIRMATION'
            ),
            new fr.TextOutputCallback(
              fr.TextOutputCallback.INFORMATION,
              objectAttributes
            ),
            new fr.ConfirmationCallback(
                'Do you want to continue or change these details?',
                fr.ConfirmationCallback.INFORMATION,
                ['CONTINUE','CHANGE'],
                0
              ),
            new fr.HiddenValueCallback(
              'pagePropsJSON',
              JSON.stringify({
                              'fullName': sharedState.get('objectAttributes').get('givenName') + "",
                              'emailAddress': sharedState.get('objectAttributes').get('mail') + "",
                              'mobileNumber': sharedState.get('objectAttributes').get('telephoneNumber') + ""
     						 }))
          ).build();

        } else {
        _log('[TOPLEVEL] Confirm Registration Choices:  here here');
           var selectedIndex = callbacks.get(2).getSelectedIndex();
            _log('[TOPLEVEL] Confirm Registration Choices:  here here 1');
           if (selectedIndex === CONTINUE_OPTION_INDEX) {
               _log('[TOPLEVEL] Confirm Registration Choices: selected CONTINUE');
               outcome = NodeOutcome.CONTINUE;
             } else {
               _log('[TOPLEVEL] Confirm Registration Choices: selected CHANGE');
               outcome = NodeOutcome.CHANGE;
             }

        }


// LIBRARY START
function _fromConfig (configItem) {
  var _CONFIG_FIDC_ENDPOINT = _getVariable('esv.c5d3143c84.manualamendpoint');
  var _CONFIG_NOTIFY_EMAIL_ENDPOINT = _getVariable('esv.926416aa96.notifyemailendpoint');
  var _CONFIG_NOTIFY_SMS_ENDPOINT = _getVariable('esv.06d383cb89.notifysmsendpoint');
  var _CONFIG_VALIDATE_SERVICE_SECRET_ENDPOINT = _getVariable('esv.983ec39961.validateservicesecretendpoint');

  const allConfigItems = {
    _ITEM_FIDC_ENDPOINT: _CONFIG_FIDC_ENDPOINT,
    _ITEM_NOTIFY_EMAIL_ENDPOINT: _CONFIG_NOTIFY_EMAIL_ENDPOINT,
    _ITEM_NOTIFY_SMS_ENDPOINT: _CONFIG_NOTIFY_SMS_ENDPOINT,
    _ITEM_VALIDATE_SERVICE_SECRET_ENDPOINT: _CONFIG_VALIDATE_SERVICE_SECRET_ENDPOINT
  };

  return allConfigItems['_ITEM_' + configItem] || ('Unknown config item : ' + configItem);
}


function _getScriptNameForDisplay(){return"undefined"!=typeof _scriptName&&_scriptName?"["+_scriptName+"]":""}
function _getOutcomeForDisplay(){return"undefined"!=typeof outcome&&outcome?"["+outcome+"]":""}function _log(e,t){
var r=_getUserNameFromSharedState(),n=_getUserIdFromSharedState();t=t||"WARNING";var a="[CHLOG]",n=_getScriptNameForDisplay(
)+"[SPAN:"+_getSpanId()+"][USER: "+r+"/"+n+"]";"MESSAGE"===t&&logger.messageEnabled()?logger.message(a.concat(n).concat(" ").concat(e)
):"WARNING"===t&&logger.warningEnabled()?logger.warning(a.concat(n).concat(" ").concat(e)):"ERROR"===t&&logger.errorEnabled()&&logger.error(
a.concat(n).concat(" ").concat(e))}function _getSelectedLanguage(e){var t="Chosen-Language";if(e&&e.get(t)){t=e.get(t).get(0);return _log(
"Selected language: "+t),t}return _log("No selected language found - defaulting to EN"),"EN"}function _loginBasedObfuscation(){
return _isAuthenticated()}function _obfuscateEmail(e){if(!e||0===e.replace(/\s/g,"").length||e.replace(/\s/g,"").indexOf("@")<=0)return e
;if(e=e.replace(/\s/g,""),_loginBasedObfuscation())return e;var t=e.indexOf("@"),r=e.substring(0,t).trim(),t=e.substring(t+1).trim()
;return r.substring(0,1).concat("*****@").concat(t)}function _isValidEmail(e){
return/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
String(e).toLowerCase())}function _obfuscatePhone(e){if(!e||e.replace(/\s/g,"").length<4)return e;if(e=e.replace(/\s/g,""),
_loginBasedObfuscation())return _padPhone(e);for(var t="",r=0;r<e.length-4;r++)t+="*";return _padPhone(t+=e.substring(e.length-4))}
function _padPhone(e){return e=e&&(e=3<(e=6<(e=(e=e.replace(/\s/g,"")).split("").reverse().join("")).length?e.substring(0,6).concat(" "
)+e.substring(6):e).length?e.substring(0,3).concat(" ")+e.substring(3):e).split("").reverse().join("")}function _isValidPhone(e){var t=!1
;if(e){for(var r=(e=e.replace(/\s/g,"")).replace(/\D/g,"").length,n=!1,a=0;a<e.length;a++){var i=e[a];if(" "!==i&&!/^\d+$/.test(i)&&(
"+"!==i&&"-"!==i&&"("!==i&&")"!==i)){n=!0;break}}t=!n&&11<=r&&r<=14}return _log("Phone number : '"+e+"' is "+(t?"VALID":"*NOT* VALID")),t}
function _getJourneyName(){var e=void 0,t=requestParameters.get("authIndexType");return t&&t.get(0)&&(!(t=requestParameters.get(
"authIndexValue"))||(t=t.get(0))&&(e=t)),e}function _getSpanId(){var e=sharedState.get("_spanId");return e||(e=(new Date).getTime(
).toString()+"-"+Math.floor(100*Math.random()).toString(),sharedState.put("_spanId",e)),e}function _fetchIDMToken(){
var e=transientState.get("idmAccessToken");return null!==e&&e}function _getFromSharedState(e){e=sharedState.get(e);return e||""}
function _getUserIdFromSharedState(){var e=_getFromSharedState("_id");if(e)return e;if(sharedState.get("objectAttributes")){
e=sharedState.get("objectAttributes");if(e&&-1!=e.toString().indexOf("get")){e=e.get("_id");if(e)return e}}return""}
function _getUserNameFromSharedState(){var e=_getFromSharedState("userName");if(e)return e;e=_getFromSharedState("username");if(e)return e
;if(sharedState){var t,e=sharedState.get("objectAttributes");if(e&&-1!=e.toString().indexOf("get")&&(t=e.get("mail")))return t}return""}
function _getUserInfoById(e,t){var r=_fromConfig("FIDC_ENDPOINT")+"/openidm/managed/alpha_user/";try{var n=r.concat(e),
a=new org.forgerock.http.protocol.Request;a.setMethod("GET"),a.setUri(n),a.getHeaders().add("Authorization","Bearer "+t),a.getHeaders().add(
"Content-Type","application/json"),a.getHeaders().add("Accept-API-Version","resource=1.0");var i=httpClient.send(a).get();if(
200!==i.getStatus().getCode())return _log("Error while fetching user: "+i.getStatus().getCode()),{success:!1,
message:"Error while fetching user: "+i.getStatus().getCode()};var o=JSON.parse(i.getEntity().getString());return o?(_log(
"user found: "+JSON.stringify(o)),{success:!0,user:o}):(_log("user NOT found: "+e),{success:!1,message:"User not found: "+e})}catch(e){
return _log(e),{success:!1,message:"Error during user lookup: "+e}}}function _getJurisdictionCode(e){
return e&&e.jurisdiction?"england-wales"===e.jurisdiction||"wales"===e.jurisdiction||"england"===e.jurisdiction?"EW":"scotland"===e.jurisdiction?"SC":"northern-ireland"===e.jurisdiction?"NI":e.jurisdiction:null
}function _getCurrentDateAsString(){return _convertDateToString(new Date)}function _convertDateToString(e){var t=[];return t.push(
e.getFullYear()),t.push(_padding(e.getMonth()+1)),t.push(_padding(e.getDate())),t.push(_padding(e.getHours())),t.push(_padding(e.getMinutes(
))),t.push(_padding(e.getSeconds())),t.push("Z"),t.join("")}function _convertStringToDate(e){var t=e.substring(0,4),r=Number(t),
t=e.substring(5,7),t=Number(t)-1,e=e.substring(8,10),e=Number(e);return Date.UTC(r,t,e)}function _convertStringToDateTime(e){
var t=e.substring(0,4),r=e.substring(4,6),n=parseInt(r)-1,a=e.substring(6,8),i=e.substring(8,10),r=e.substring(10,12),e=e.substring(12,14)
;return Date.UTC(t,n,a,i,r,e)}function _padding(e){return e<10?"0"+e:e}function _getVariable(e){try{if(e)return systemEnv.getProperty(
e.replace("-",".").replace("_",".").toLowerCase())}catch(e){_log(e)}return null}function _getSecret(e){return _getVariable(e)}
function _isAuthenticated(){return"undefined"!=typeof existingSession?(_log("User is authenticated"),!0):(_log("User is NOT authenticated"),
!1)}
// LIBRARY END