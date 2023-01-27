/* Add any useful library functions here ...

If the following commented tags are found in a script, the contents of this file
will be merged between the tags, replacing anything already there.

The reason that the contents are merged rather than replaced is because if the server-side script happens
to be pasted back into this project file it will safely be replaced with the latest version of the library code when
it is next deployed.

// LIBRARY START
// LIBRARY END

It is also recommended that a global var called "_scriptName" is declared so that logging can be refined per-script.

Note that comments in this file will be removed as part of the JS minification at point of merge.
*/

function _getScriptNameForDisplay () {
  return (typeof _scriptName !== 'undefined' && _scriptName) ? '[' + _scriptName + ']' : '';
}

function _getOutcomeForDisplay () {
  return (typeof outcome !== 'undefined' && outcome) ? '[' + outcome + ']' : '';
}

function _log (message, logLevel) {
  
  var userName = _getUserNameFromSharedState ();
  var userId = _getUserIdFromSharedState ();
  
  if (!logLevel) {
    logLevel = 'WARNING';
  }

  var chLogMarker = '[CHLOG]';
  var scriptNameForDisplay = _getScriptNameForDisplay() + '[SPAN:' + _getSpanId() + ']' + '[USER: ' + userId + ']';

  if (logLevel === 'MESSAGE' && logger.messageEnabled()) {
    logger.message(chLogMarker.concat(scriptNameForDisplay).concat(' ').concat(message));
  } else if (logLevel === 'WARNING' && logger.warningEnabled()) {
    logger.warning(chLogMarker.concat(scriptNameForDisplay).concat(' ').concat(message));
  } else if (logLevel === 'ERROR' && logger.errorEnabled()) {
    logger.error(chLogMarker.concat(scriptNameForDisplay).concat(' ').concat(message));
  }
}

function _getSelectedLanguage (requestHeaders) {
  var langHeader = 'Chosen-Language';

  if (requestHeaders && requestHeaders.get(langHeader)) {
    var lang = requestHeaders.get(langHeader).get(0);
    _log('Selected language: ' + lang);
    return lang;
  }
  _log('No selected language found - defaulting to EN');
  return 'EN';
}

function _loginBasedObfuscation () {
  // If logged in, we won't obfuscate any content
  return _isAuthenticated();
}

function _obfuscateEmail (email) {
  if (!email || email.replace(/\s/g, '').length === 0 || email.replace(/\s/g, '').indexOf('@') <= 0) {
    return email;
  }

  email = email.replace(/\s/g, '');

  if (_loginBasedObfuscation()) {
    return email;
  }

  var at = email.indexOf('@');
  var username = email.substring(0, at).trim();
  var domain = email.substring(at + 1).trim();

  return username.substring(0, 1).concat('*****@').concat(domain);
}

function _isValidEmail (email) {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

function _obfuscatePhone (phone) {
  var NUM_CHARS_TO_SHOW = 4;

  if (!phone || phone.replace(/\s/g, '').length < NUM_CHARS_TO_SHOW) {
    return phone;
  }

  phone = phone.replace(/\s/g, '');

  if (_loginBasedObfuscation()) {
    return _padPhone(phone);
  }

  var buffer = '';
  for (var i = 0; i < phone.length - NUM_CHARS_TO_SHOW; i++) {
    buffer = buffer + '*';
  }

  buffer = buffer + phone.substring(phone.length - NUM_CHARS_TO_SHOW);

  return _padPhone(buffer);
}

function _padPhone (phone) {
  if (!phone) {
    return phone;
  }

  phone = phone.replace(/\s/g, '');

  phone = phone.split('').reverse().join('');

  if (phone.length > 6) {
    phone = phone.substring(0, 6).concat(' ') + phone.substring(6);
  }

  if (phone.length > 3) {
    phone = phone.substring(0, 3).concat(' ') + phone.substring(3);
  }

  phone = phone.split('').reverse().join('');

  return phone;
}

function _ukNumberPrefix() {
  return "44";
}

function _internationalCallingCodes() {
  return  ['1','7','20','27','30','31','32','33','34','36','39','40','41','43','44','45','46','47','48','49','51',
         '52','53','54','55','56','57','58','60','61','62','63','64','65','66','81','82','84','86','90','91','92',
         '93','94','95','98','211','212','213','216','218','220','221','222','223','224','225','226','227','228',
         '229','230','231','232','233','234','235','236','237','238','239','240','241','242','243','244','245',
         '246','248','249','250','251','252','253','254','255','256','257','258','260','261','262','263','264',
         '265','266','267','268','269','297','298','299','350','351','352','353','354','355','356','357','358',
         '359','370','371','372','373','374','375','376','377','378','380','381','382','385','386','387','389',
         '420','421','423','500','501','502','503','504','505','506','507','508','509','590','591','592','593',
         '594','595','596','597','598','599','670','672','673','674','675','676','677','678','679','680','682',
         '685','687','689','691','692','852','853','855','856','880','886','960','961','962','963','964','965',
         '966','967','968','970','971','972','973','974','975','976','977','992','993','994','995','996','998',
         '1242','1246','1264','1268','1284','1345','1441','1473','1649','1664','1684','1721','1758','1767','1784',
         '1868','1869','1876'];
}

function _isValidPhone (number) {
  var mobileValid = false;

  if (number) {
    number = number.replace(/\s/g, '');

    var digits = number.replace(/\D/g, '')
    var digitsCount = digits.length;
    var containsInvalidChar = false;

    for (var i = 0; i < number.length; i++) {
      var ch = number[i];

      if (ch === ' ' || /^\d+$/.test(ch)) {
        continue;
      }

      if (!(ch === '+' || ch === '-' || ch === '(' || ch === ')')) {
        containsInvalidChar = true;
        break;
      }
    }

    mobileValid = (!containsInvalidChar && _isValidPhoneNumberFormat(digits));
  }

  _log('Phone number : \'' + number + '\' is ' + (mobileValid ? 'VALID' : '*NOT* VALID'));
  return mobileValid;
}


//Validation logic taken from notify service
//number parameter needs to be digits only with no whitespaces
function _isUkPhoneNumber(number) {

     if(number.startsWith("0") && !number.startsWith("00")){
       return true;
     }

     //removing leading 0s
     number = number.replace(/^0*/,'');

     if((number.startsWith(_ukNumberPrefix()) || (number.startsWith("7") && number.length < 11))) {
         return true;
      }

      return false;
}

//Validation logic taken from notify service
//number parameter needs to be digits only with no whitespaces
function _isValidUkPhoneNumber(number) {
     //removing leading 4s and 0s
     number = number.replace(/^4*/,'').replace(/^0*/,'');

     if((number.startsWith("7") && number.length === 10)) {
         return true;
      }

      return false;
}

//Validation logic taken from notify service
//number parameter needs to be digits only with no whitespaces
function _isValidInternationalPhoneNumber(number) {
     //removing leading 0s
     number = number.replace(/^0*/,'')

     if(_hasInternationalPrefix(number) && number.length > 7 && number.length < 16) {
         return true;
      }
      return false;
}

//Validation logic taken from notify service
//number parameter needs to be digits only with no whitespaces
function _hasInternationalPrefix(number){
var callingCodes = _internationalCallingCodes();
for (code in callingCodes){
   if(number.startsWith(code)){
      return true;
   }
}
return false;
}

//number parameter needs to be digits only with no whitespaces
function _isValidPhoneNumberFormat(number){
  if(_isUkPhoneNumber(number)){
     return _isValidUkPhoneNumber(number);
  }

  return _isValidInternationalPhoneNumber(number);
}


function _getJourneyName () {
  var journeyName = undefined;
  var authIndexType = requestParameters.get('authIndexType');

  if (authIndexType) {
    var ait = authIndexType.get(0);
    if (ait) {
      var authIndexValue = requestParameters.get('authIndexValue');
      if (authIndexValue) {
        var aiv = authIndexValue.get(0);
        if (aiv) {
          journeyName = aiv;
        }
      }
    }
  }

  //_log('Resolved Journey Name as : ' + journeyName);
  return journeyName;
}

function _getSpanId () {
  var spanId = sharedState.get('_spanId');
  if (!spanId) {
    spanId = new Date().getTime().toString() + '-' + Math.floor(Math.random() * 100).toString();
    sharedState.put('_spanId', spanId);
  }
  return spanId;
}

function _fetchIDMToken () {
  var accessToken = transientState.get('idmAccessToken');
  if (accessToken === null) {
   // _log('Access token not in transient state');
    return false;
  }
  return accessToken;
}

function _getFromSharedState (propName) {
  var propNameValue = sharedState.get(propName);

  if (propNameValue) {
    //_log('SharedState -> ' + propName + ' : ' + propNameValue);
    return propNameValue;
  }

  return '';
}

function _getUserIdFromSharedState () {
  var idProp = _getFromSharedState('_id');
  if (idProp) {
    return idProp;
  }

  if (sharedState.get('objectAttributes')) {
    var objAttributes = sharedState.get('objectAttributes');
    if(objAttributes && objAttributes.toString().indexOf('get') != -1) {
      var oaIdProp = objAttributes.get('_id');
      if (oaIdProp) {
        //_log('SharedState -> objectAttributes._id : ' + oaIdProp);
        return oaIdProp;
      }
    }
  }

  return '';
}

function _getUserNameFromSharedState () {
  var userNameProp = _getFromSharedState('userName');
  if (userNameProp) {
    return userNameProp;
  }

  var usernameProp = _getFromSharedState('username');
  if (usernameProp) {
    return usernameProp;
  }

  if (sharedState) {
    var objAttributes = sharedState.get('objectAttributes')
    
    var oaMailProp;
    if (objAttributes && objAttributes.toString().indexOf('get') != -1){
      oaMailProp = objAttributes.get('mail');
      if(oaMailProp){
        return oaMailProp;
      }
    }    
  }

  return '';
}

function _getUserInfoById (userId, accessToken) {
  var idmUserEndpoint = _fromConfig('FIDC_ENDPOINT') + '/openidm/managed/alpha_user/';
  try {
    var idmUserIdEndpoint = idmUserEndpoint.concat(userId);
    var request = new org.forgerock.http.protocol.Request();

    request.setMethod('GET');
    request.setUri(idmUserIdEndpoint);
    request.getHeaders().add('Authorization', 'Bearer ' + accessToken);
    request.getHeaders().add('Content-Type', 'application/json');
    request.getHeaders().add('Accept-API-Version', 'resource=1.0');

    var response = httpClient.send(request).get();

    if (response.getStatus().getCode() === 200) {
      var user = JSON.parse(response.getEntity().getString());
      if (user) {
        _log('user found: ' + JSON.stringify(user));
        return {
          success: true,
          user: user
        };
      } else {
        _log('user NOT found: ' + userId);
        return {
          success: false,
          message: 'User not found: ' + userId
        };
      }
    } else {
      _log('Error while fetching user: ' + response.getStatus().getCode());
      return {
        success: false,
        message: 'Error while fetching user: ' + response.getStatus().getCode()
      };
    }
  } catch (e) {
    _log(e);
    return {
      success: false,
      message: 'Error during user lookup: ' + e
    };
  }
}

// convert jurisdiction name to code
function _getJurisdictionCode (data) {

  if (!data || !data.jurisdiction) {
    return null;
  }

  if (data.jurisdiction === 'england-wales' || data.jurisdiction === 'wales' || data.jurisdiction === 'england') {
    return 'EW';
  } else if (data.jurisdiction === 'scotland') {
    return 'SC';
  } else if (data.jurisdiction === 'northern-ireland') {
    return 'NI';
  } else {
    return data.jurisdiction;
  }
}

function _getCurrentDateAsString () {
  var date = new Date();
  return _convertDateToString(date);
}

//converts a JS date/time into a string in RFC-4517 format (YYYY-MM-DDTHH:MM:SSZ)
function _convertDateToString (date) {
  var result = [];
  result.push(date.getFullYear());
  result.push(_padding(date.getMonth() + 1));
  result.push(_padding(date.getDate()));
  result.push(_padding(date.getHours()));
  result.push(_padding(date.getMinutes()));
  result.push(_padding(date.getSeconds()));
  result.push('Z');
  return result.join('');
}

//accepts a date in string format (YYYY-MM-DD) and converts it into UTC Date (e.g. 2022-01-14T00:00:00Z)
//example input: 2022-01-14
function _convertStringToDate (dateStr) {
  const year = dateStr.substring(0, 4);
  var offsetYear = Number(year);
  const month = dateStr.substring(5, 7);
  var offsetMonth = Number(month) - 1;
  const day = dateStr.substring(8, 10);
  var offsetDay = Number(day);
  return Date.UTC(offsetYear, offsetMonth, offsetDay);
}

//accepts a datetime in string format (YYYY-MM-DDTHH:MM:SSZ) and converts it into UTC Date 
//example input: 2022-01-14T13:41:33Z
function _convertStringToDateTime (dateStr) {
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const offsetMonth = parseInt(month) - 1;
  const day = dateStr.substring(6, 8);
  const hour = dateStr.substring(8, 10);
  const min = dateStr.substring(10, 12);
  const sec = dateStr.substring(12, 14);

  return Date.UTC(year, offsetMonth, day, hour, min, sec);
}

function _padding (num) {
  return num < 10 ? '0' + num : num;
}

function _getVariable (varName) {
  try {
    if (varName) {
      return systemEnv.getProperty(varName.replace('-', '.').replace('_', '.').toLowerCase());
    }
  } catch (e) {
    _log(e);
  }
  return null;
}

function _getSecret (secretName) {
  return _getVariable(secretName);
}

function _isAuthenticated () {
  if (typeof existingSession !== 'undefined') {
    _log('User is authenticated');
    return true;
  } else {
    _log('User is NOT authenticated');
    return false;
  }
}