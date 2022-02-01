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
  if (!logLevel) {
    logLevel = 'MESSAGE';
  }

  var chLogMarker = '[CHLOG]';
  var scriptNameForDisplay = _getScriptNameForDisplay() + '[SPAN:' + _getSpanId() + ']';

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

function _obfuscateEmail (email) {
  if (!email || email.replace(/\s/g, '').length === 0 || email.replace(/\s/g, '').indexOf('@') <= 0) {
    return email;
  }

  email = email.replace(/\s/g, '');

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

  if (phone.length > 5) {
    phone = phone.substring(0, 5).concat(' ') + phone.substring(5);
  }

  if (phone.length > 9) {
    phone = phone.substring(0, 9).concat(' ') + phone.substring(9);
  }

  return phone;
}

function _isValidPhone (number) {
  var mobileValid = false;

  if (number) {
    number = number.replace(/\s/g, '');

    var digitsCount = number.replace(/\D/g, '').length;
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

    mobileValid = (!containsInvalidChar && (digitsCount >= 11 && digitsCount <= 13));
  }

  _log('Phone number : \'' + number + '\' is ' + (mobileValid ? 'VALID' : '*NOT* VALID'));
  return mobileValid;
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

  _log('Resolved Journey Name as : ' + journeyName);
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
    _log('Access token not in transient state');
    return false;
  }
  return accessToken;
}

function _getFromSharedState (propName) {
  var propNameValue = sharedState.get(propName);

  if (propNameValue) {
    _log('SharedState -> ' + propName + ' : ' + propNameValue);
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
    var oaIdProp = sharedState.get('objectAttributes').get('_id');
    if (oaIdProp) {
      _log('SharedState -> objectAttributes._id : ' + oaIdProp);
      return oaIdProp;
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

  if (sharedState.get('objectAttributes')) {
    var oaMailProp = sharedState.get('objectAttributes').get('mail');
    if (oaMailProp) {
      _log('SharedState -> objectAttributes.mail : ' + oaMailProp);
      return oaMailProp;
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