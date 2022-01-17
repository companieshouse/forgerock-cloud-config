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
  var mobileValid = /^((0044|0|\+44)7\d{3}\s?\d{6})$/.test(number);
  if (mobileValid) {
    _log('phone number : \'' + number + '\' is valid');
    return true;
  }
  _log('phone number : \'' + number + '\' is NOT valid');
  return false;
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

function _convertDateToString (date) {
  var result = [];
  result.push(date.getFullYear());
  result.push(padding(date.getMonth() + 1));
  result.push(padding(date.getDate()));
  result.push(padding(date.getHours()));
  result.push(padding(date.getMinutes()));
  result.push(padding(date.getSeconds()));
  result.push('Z');
  return result.join('');
}

function _convertStringToDate (dateStr) {
  const year = dateStr.substring(0, 4);
  var offsetYear = Number(year);
  const month = dateStr.substring(5, 7);
  var offsetMonth = Number(month) - 1;
  const day = dateStr.substring(8, 10);
  var offsetDay = Number(day);
  return Date.UTC(offsetYear, offsetMonth, offsetDay);
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