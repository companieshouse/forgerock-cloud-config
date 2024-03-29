(function () {
  const logNowMsecs = new Date().getTime();
  _logDebug('SCRS Starting! request = ' + JSON.stringify(request));

  const BEARER_TOKEN_COMPANY_SUBMISSIONS = _getVariableOrSecret('esv.032feca6b7.scrscompanysubmissionstoken');
  const BEARER_TOKEN_AUTHORISED_FILERS_EMAILS = _getVariableOrSecret('esv.bada060229.scrsauthorisedfilersemailstoken');

  const ENDPOINT_COMPANY_SUBMISSIONS = _getVariableOrSecret('esv.c5d3143c84.manualcompanyincorporationsendpoint');
  const ENDPOINT_AUTHORISED_FILERS_EMAILS = _getVariableOrSecret('esv.c5d3143c84.manualemailsendpoint');
  const ENDPOINT_FIDC = _getVariableOrSecret('esv.c5d3143c84.manualamendpoint');
  const ENDPOINT_IDAM_UI = _getVariableOrSecret('esv.c5d3143c84.manualcustomuiurl');

  const OBJECT_USER = 'alpha_user';
  const OBJECT_COMPANY = 'alpha_organization';

  const SYSTEM_WEBFILING_USER = 'system/WebfilingUser/webfilingUser';
  const SYSTEM_CHS_COMPANY = 'system/CHSCompany/company_profile';
  const SYSTEM_WEBFILING_AUTHCODE = 'system/WebfilingAuthCode/authCode';

  const DEFAULT_SUBMISSIONS_PER_PAGE = 50;
  const IDAM_USERNAME = _getVariableOrSecret('esv.c5d3143c84.manualidmusername');
  const IDAM_PASSWORD = _getVariableOrSecret('esv.c5d3143c84.manualidmpassword');
  const IDAM_SCRS_SERVICE_USERNAME = _getVariableOrSecret('esv.d0f01990f4.manualscrsusername');

  const CREATE_USER_USING_RECON_BY_ID = false;

  var AuthorisationStatus = {
    CONFIRMED: 'confirmed',
    PENDING: 'pending',
    NONE: 'none'
  };

  var _ewfUserParentUsernameMap = new Map();

  function _log (message) {
    logger.error('[CHLOG][SCRS][' + logNowMsecs + '] ' + message);
  }

  function _logDebug (message) {
      logger.debug('[CHLOG][SCRS][' + logNowMsecs + '] ' + message);
    }

  function _getVariableOrSecret (name) {
    const fixedName = name.replace(/-/g, '.');
    const value = identityServer.getProperty(fixedName);
    _logDebug('Returning variable or secret : ' + fixedName + ' as : ' + value);
    return value;
  }

  function uuidv4 () {
    var s = [];
    var hexDigits = '0123456789abcdef';
    for (var i = 0; i < 36; i++) {
      s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = '4';
    s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);
    s[8] = s[13] = s[18] = s[23] = '-';

    return s.join('');
  }

  function sleepMSecs (msecs) {
    _logDebug('Sleeping for : ' + msecs + ' msecs');

    var waitTill = new Date(new Date().getTime() + msecs);
    while (waitTill > new Date()) {}
  }

  function removeDuplicateEmails (data) {
    let emails = [];

    data.forEach(email => {
      if (email && !emails.includes(email)) {
        emails.push(email);
      }
    });

    return emails;
  }

  function padding (num) {
    return num < 10 ? '0' + num : num;
  }

  function minusHours (h) {
    let date = new Date();
    date.setHours(date.getHours() - h);
    return date;
  }

  function getCompanyIncorporations (incorporationTimepoint, useIncorporationsPerPage) {
    _logDebug('Getting Company Incorporations from timepoint : ' + incorporationTimepoint + ' (items_per_page = ' + useIncorporationsPerPage + ')');

    const url = ENDPOINT_COMPANY_SUBMISSIONS + '?timepoint=' + incorporationTimepoint + '&items_per_page=' + useIncorporationsPerPage;
    _logDebug('Company Incorporations url : ' + url);

    let request = {
      'url': url,
      'method': 'GET',
      'headers': {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + BEARER_TOKEN_COMPANY_SUBMISSIONS
      }
    };

    return openidm.action('external/rest', 'call', request);
  }

  function callNotificationJourney (email, link, companyName, companyNumber, isNewUser, userId, linkTokenUuid, language) {
    try {
      let headers = {
        'Content-Type': 'application/json',
        'CH-Username': IDAM_USERNAME,
        'CH-Password': IDAM_PASSWORD,
        'Notification-Link': link,
        'Notification-Email': email,
        'Notification-Language': language || 'en',
        'Notification-Company-Number': companyNumber,
        'Notification-Company-Name': companyName,
        'Notification-User-Id': userId,
        'Notification-Token-Uuid': linkTokenUuid,
        'New-User': isNewUser.toString()
      };

      let request = {
        'url': ENDPOINT_FIDC + '/am/json/alpha/authenticate?authIndexType=service&authIndexValue=CHSendSCRSNotifications&noSession=true',
        'method': 'POST',
        'forceWrap': true,
        'headers': headers
      };

      _logDebug('Journey Request:  ' + JSON.stringify(request));
      let journeyResponse = openidm.action('external/rest', 'call', request);
      _logDebug('Journey Response:  ' + JSON.stringify(journeyResponse));

      return journeyResponse;
    } catch (e) {
      _log('Error calling notification journey : ' + e);

      return {
        code: 500,
        message: e.toString()
      };
    }
  }

  function getUserById (id) {
    return openidm.read(
      'managed/alpha_user/' + id,
      null,
      ['_id', 'userName', 'telephoneNumber', 'givenName', 'memberOfOrg']
    );
  }

  function getUserByUsername (username) {
    _logDebug('Looking up username : ' + username);

    let response = openidm.query(
      'managed/' + OBJECT_USER,
      { '_queryFilter': '/userName eq "' + username + '"' },
      ['_id', 'userName', 'givenName', 'roles', 'authzRoles', 'memberOfOrg', 'accountStatus', 'frUnindexedString3']
    );

    if (response.resultCount !== 1) {
      _log('getUserByUsername: No user found');
      _logDebug('getUserByUsername: No user found for : ' + username);
      return null;
    }

    return response.result[0];
  }

  function getScrsServiceUser () {
    return openidm.query(
      'managed/' + OBJECT_USER,
      { '_queryFilter': '/userName eq "' + IDAM_SCRS_SERVICE_USERNAME + '"' },
      ['_id', 'userName', 'description']
    );
  }

  function getOrCreateScrsServiceUser (initialTimepoint) {
    _logDebug('Initial Timepoint for SCRS Service User : ' + initialTimepoint);

    let response = getScrsServiceUser();
    if (response.resultCount === 0) {
      _log('SCRS Service User not found, creating it');

      createUser(IDAM_SCRS_SERVICE_USERNAME, initialTimepoint);

      return openidm.query(
        'managed/' + OBJECT_USER,
        { '_queryFilter': '/userName eq "' + IDAM_SCRS_SERVICE_USERNAME + '"' },
        ['_id', 'userName', 'description']
      );
    }

    _logDebug('Found existing SCRS Service User : ' + response.result[0]);

    return response.result[0];
  }

  function updateScrsServiceUserTimepoint (scrsUserId, updatedTimepoint) {
    _logDebug('Updating SCRS Service User Id : ' + scrsUserId + ' with next timePoint of : ' + updatedTimepoint);

    if (scrsUserId && updatedTimepoint) {
      let descriptionUpdate = {
        operation: 'replace',
        field: '/description',
        value: updatedTimepoint
      };

      openidm.patch('managed/' + OBJECT_USER + '/' + scrsUserId,
        null,
        [descriptionUpdate]);

      _logDebug('Updated with next timePoint : ' + updatedTimepoint);
    }
  }

  function getParentUsernameFromEwf (email) {
    try {
      if (!email || email.trim() === '') {
        return null;
      }

      email = email.trim();

      let cacheKey = email.toUpperCase();

      if (_ewfUserParentUsernameMap.has(cacheKey)) {
        _logDebug('EWF Parent Name query for : ' + email + ', Cached Value = ' + _ewfUserParentUsernameMap.get(cacheKey));
        return _ewfUserParentUsernameMap.get(cacheKey);
      }

      let response = openidm.query(
        SYSTEM_WEBFILING_USER,
        { '_queryFilter': 'EMAIL eq "' + email + '"' }
      );

      _logDebug('EWF Parent Name query for : ' + email + ', Count = ' + response.resultCount);

      if (response.resultCount === 1) {
        _logDebug('Response from EWF : ' + JSON.stringify(response.result[0]));

        if (response.result[0]._id) {
          _ewfUserParentUsernameMap.set(cacheKey, response.result[0]._id);
          _logDebug('EWF Parent Name query for : ' + email + ', Value put in Cache = ' + response.result[0]._id);
          return response.result[0]._id;
        }
      }
    } catch (e) {
      _log('Error : ' + e);
    }

    return null;
  }

  function createUser (email, description, linkTokenHint, ewfParentUsernameForEmail) {
    _logDebug('User does not exist: Creating new user with username ' + email);

    let userDetails = {
      'userName': email,
      'sn': email,
      'mail': email,
      'accountStatus': 'inactive'
    };

    if (description) {
      userDetails.description = description;
    }

    if (linkTokenHint) {
      userDetails.frUnindexedString3 = linkTokenHint;
    }

    if (ewfParentUsernameForEmail) {
      _logDebug('EWF ParentUsername for ' + email + ' = ' + ewfParentUsernameForEmail);
      userDetails.frIndexedString1 = ewfParentUsernameForEmail;
    }

    _logDebug('User details for createUser : ' + JSON.stringify(userDetails));

    return openidm.create('managed/' + OBJECT_USER, null, userDetails);
  }

  function updateUserLinkTokenId (userId, linkTokenUuid) {
    _logDebug('Updating User Id : ' + userId + ' with linkTokenUuid of : ' + linkTokenUuid);

    if (userId && linkTokenUuid) {
      let linkTokenUuidUpdate = {
        operation: 'replace',
        field: '/frUnindexedString3',
        value: linkTokenUuid
      };

      openidm.patch('managed/' + OBJECT_USER + '/' + userId,
        null,
        [linkTokenUuidUpdate]);

      _logDebug('Updated with linkTokenUuid : ' + linkTokenUuid);
    }
  }

  function fixCreationDate (incorporationDate) {
    if (!incorporationDate) {
      return incorporationDate;
    }

    return incorporationDate + 'T00:00:00Z';
  }

  function getCompany (companyNumber) {
    let response = openidm.query(
      'managed/' + OBJECT_COMPANY,
      { '_queryFilter': '/number eq "' + companyNumber + '"' },
      ['_id', 'number', 'name', 'authCode', 'status', 'members', 'addressLine1', 'addressLine2',
        'jurisdiction', 'locality', 'postalCode', 'region', 'type', 'members']
    );

    if (response.resultCount === 0) {
      return null;
    }

    return response.result[0];
  }

  function mapCHSCompanyJurisdiction (data) {
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

  function mapCHSCompanyStatus (data) {
    if (!data || !data.company_status) {
      return 'inactive';
    }

    if (data.company_status === 'active') {
      return 'active';
    }

    return 'inactive';
  }

  function mapCHSCompanyRegisteredOfficeAddress (companyData, data) {
    if (!companyData || !data || !data.registered_office_address) {
      return;
    }

    if (data.registered_office_address.address_line_1) {
      companyData.addressLine1 = data.registered_office_address.address_line_1;
    }

    if (data.registered_office_address.locality) {
      companyData.locality = data.registered_office_address.locality;
    }

    if (data.registered_office_address.region) {
      companyData.region = data.registered_office_address.region;
    }

    if (data.registered_office_address.postal_code) {
      companyData.postalCode = data.registered_office_address.postal_code;
    }
  }

  function mapCHSCompanyAuthCode (companyData, data) {
    if (!companyData || !data || !data.AUTHCODE) {
      return;
    }

    companyData.authCode = data.AUTHCODE;

    let validFrom = null;
    let validTo = null;

    if (data.STARTDTE) {
      validFrom = data.STARTDTE;
    }

    if (data.EXPIRYDTE) {
      validTo = data.EXPIRYDTE;
    }

    companyData.authCodeValidFrom = validFrom;
    companyData.authCodeValidTo = validTo;
  }

  function mapCHSCompanyType (companyData, data) {
    if (!companyData || !data || !data.type) {
      return;
    }

    companyData.type = data.type;
  }

  function createCompany (companyIncorp) {
    _logDebug('Creating new company with details : ' + companyIncorp);

    let chsResponse = openidm.query(
      SYSTEM_CHS_COMPANY,
      { '_queryFilter': '_id eq "' + companyIncorp.company_number + '"' }
    );

    if (chsResponse && chsResponse.resultCount && chsResponse.resultCount === 1 && chsResponse.result[0] && chsResponse.result[0].data) {

      let authCodeResponse = openidm.query(
        SYSTEM_WEBFILING_AUTHCODE,
        { '_queryFilter': '_id eq "' + companyIncorp.company_number + '"' }
      );

      if (authCodeResponse && authCodeResponse.resultCount && authCodeResponse.resultCount === 1 && authCodeResponse.result[0]) {

        // Create the company using the retrieved data

        _logDebug('Creating company using retrieved CHS & Auth Code data');

        const companyData = {
          'number': companyIncorp.company_number,
          'name': companyIncorp.company_name,
          'creationDate': fixCreationDate(companyIncorp.incorporated_on),
          'jurisdiction': mapCHSCompanyJurisdiction(chsResponse.result[0].data),
          'status': mapCHSCompanyStatus(chsResponse.result[0].data)
        };

        mapCHSCompanyRegisteredOfficeAddress(companyData, chsResponse.result[0].data);
        mapCHSCompanyType(companyData, chsResponse.result[0].data);

        mapCHSCompanyAuthCode(companyData, authCodeResponse.result[0]);

        return openidm.create('managed/' + OBJECT_COMPANY,
          null,
          companyData
        );

      }

    }

    // Create the company manually for now with the limited data we have

    _logDebug('Creating company using SCRS supplied data');

    return openidm.create('managed/' + OBJECT_COMPANY,
      null,
      {
        'number': companyIncorp.company_number,
        'name': companyIncorp.company_name,
        'creationDate': fixCreationDate(companyIncorp.incorporated_on),
        'status': 'active'
      });
  }

  function addConfirmedRelationshipToCompany (subjectId, companyId, companyLabel) {
    let payload = [
      {
        operation: 'add',
        field: '/memberOfOrg/-',
        value: {
          _ref: 'managed/' + OBJECT_COMPANY + '/' + companyId,
          _refProperties: {
            membershipStatus: AuthorisationStatus.CONFIRMED,
            companyLabel: companyLabel,
            inviterId: null,
            inviteTimestamp: null
          }
        }
      }
    ];

    let newObject = openidm.patch(
      'managed/' + OBJECT_USER + '/' + subjectId,
      null,
      payload
    );

    if (JSON.stringify(newObject.memberOfOrgIDs).indexOf(companyId) > -1) {
      return {
        success: true
      };
    }

    return {
      success: false,
      message: 'The relationship with company ' + companyId + ' could not be added to the user'
    };
  }

  function getCompanyEmails (companyNumber) {
    try {
      let request = {
        'url': ENDPOINT_AUTHORISED_FILERS_EMAILS + '?companyNo=' + companyNumber,
        'method': 'GET',
        'headers': {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + BEARER_TOKEN_AUTHORISED_FILERS_EMAILS
        }
      };

      _logDebug('Get Company Emails request : ' + JSON.stringify(request));
      const result = openidm.action('external/rest', 'call', request);
      _logDebug('Get Company Emails response : ' + JSON.stringify(result));

      return result;
    } catch (e) {

      if(e.javaException){
          const code = e.javaException.code;
          const detail = e.javaException.detail ? JSON.parse(e.javaException.detail) : {};

          if(code === 400 && detail.body && (detail.body.error_code === "1000" || detail.body.error_code === "1001")){
               _logDebug('Error in calling filers endpoint for company ' + companyNumber + ' - code: ' + detail.body.error_code + ' - ' + detail.body.message);
               _log('Error in calling filers endpoint for company');
          } else {
               _log('Error in getCompanyEmails() call : ' + e);
          }
      } else {
          _log('Error in getCompanyEmails() call : ' + e);
      }

      return {};
    }
  }

  function determineTimePoint () {
    let timePoint;

    if (request.additionalParameters.timepoint) {
      timePoint = request.additionalParameters.timepoint;
    } else {
      let date = minusHours(4);

      timePoint = [
        date.getFullYear(),
        padding(date.getMonth() + 1),
        padding(date.getDate()),
        padding(date.getHours()),
        padding(date.getMinutes()),
        padding(date.getSeconds()),
        date.getMilliseconds()
      ].join('');
    }

    _logDebug('Using default timepoint: ' + timePoint);

    let scrsServiceUserDetails = getOrCreateScrsServiceUser(timePoint);

    _logDebug('SCRS Service User : ' + scrsServiceUserDetails);

    if (scrsServiceUserDetails && scrsServiceUserDetails.description) {
      _logDebug('Using timePoint from SCRS Service User : ' + scrsServiceUserDetails.description);

      timePoint = scrsServiceUserDetails.description;
    }

    _logDebug('Final timePoint for Integration Call : ' + timePoint);
    return timePoint;
  }

  function getParameterFromUrlByName (url, name) {
    name = name.replace(/[\[\]]/g, '\\$&');

    let regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
      results = regex.exec(url);

    if (!results) return null;
    if (!results[2]) return '';

    return decodeURIComponent(results[2].replace(/\+/g, ' '));
  }

  function extractLinksNextTimePoint (linksNext, defaultValue) {
    _logDebug('Links Next = ' + linksNext);

    if (!linksNext) {
      return defaultValue;
    }

    let timePointParam = getParameterFromUrlByName(linksNext, 'timepoint');

    if (timePointParam) {
      _logDebug('Incorporations Links > Next timePoint : ' + timePointParam);
      return timePointParam;
    }

    return defaultValue;
  }

  // ================================================================================================================
  // ENTRY POINT
  // ================================================================================================================

  let outputUsers = [];
  let addedCompanies = [];

  let companyAttemptCount = 0;
  let companySuccessCount = 0;
  let companyFailureCount = 0;

  let userFailureCount = 0;

  let timePoint = '';
  let linksNextTimePoint = '';
  let responseNextTimePoint = '';
  let responseMessage = 'OK';

  let itemsPerPage = request.additionalParameters.numIncorporationsPerPage || DEFAULT_SUBMISSIONS_PER_PAGE;

  function addConfirmedRelationshipAndEmail (email, emailLang, foundUser, companyInfo, newUser, linkTokenUuid) {

    addConfirmedRelationshipToCompany(foundUser._id, companyInfo._id, companyInfo.name + ' - ' + companyInfo.number);

    let notificationResponse = callNotificationJourney(email, ENDPOINT_IDAM_UI, companyInfo.name, companyInfo.number, newUser,
      foundUser._id, linkTokenUuid, emailLang);

    _logDebug('notification response : ' + JSON.stringify(notificationResponse));

    outputUsers.push({
      _id: foundUser._id,
      email: email,
      companyNumber: companyInfo.number,
      companyName: companyInfo.name,
      newUser: newUser,
      accountStatus: newUser ? 'inactive' : foundUser.accountStatus,
      emailNotification: notificationResponse.code === 200 ? 'success' : 'fail',
      message: 'The user with email : ' + email + ' has been added as a member of company ' + companyInfo.name + ' (' + companyInfo.number + ') - status: confirmed'
    });

  }

  function triggerReconById (email, ewfParentUsernameForEmail) {
    _logDebug('Triggering reconById for email : ' + email + ', ewfParentUserName : ' + ewfParentUsernameForEmail);

    const response = openidm.action('recon', 'reconById', {}, {
      'mapping': 'webfilingUser_alphaUser',
      'id': ewfParentUsernameForEmail,
      'waitForCompletion': false
    });

    _logDebug('ReconById response: ' + response);
  }

  function associateUserWithCompany (email, companyInfo) {
    try {
      // Force to EN based on a CH Decision that all SCRS user emails are in English
      let emailLang = 'en';

      let ewfParentUsernameForEmail = getParentUsernameFromEwf(email);
      _logDebug('EWF ParentUsername for ' + email + ' = ' + ewfParentUsernameForEmail);

      _logDebug('Processing user with email : ' + email + ', language = ' + emailLang);
      let foundUser = getUserByUsername(email);

      let linkTokenUuid = uuidv4();
      if (foundUser && foundUser.frUnindexedString3) {
        linkTokenUuid = foundUser.frUnindexedString3;
      }

      if (!ewfParentUsernameForEmail) {

        _log('No EWF PARENT_NAME found');

        if (!foundUser) {

          _log('No FIDC User found');

          foundUser = createUser(email, null, linkTokenUuid);
          _logDebug('New User ID: ' + foundUser._id);

          let newUser = true;
          addConfirmedRelationshipAndEmail(email, emailLang, foundUser, companyInfo, newUser, linkTokenUuid);

        } else {

          _log('FIDC User found');

          let newUser = false;
          addConfirmedRelationshipAndEmail(email, emailLang, foundUser, companyInfo, newUser, linkTokenUuid);
          updateUserLinkTokenId(foundUser._id, linkTokenUuid);

        }

      } else {

        _logDebug('EWF PARENT_NAME found : ' + ewfParentUsernameForEmail);

        if (!foundUser) {

          _log('No FIDC User found');

          if (CREATE_USER_USING_RECON_BY_ID) {

            _logDebug('Creating user : ' + email + 'using reconById() strategy');

            let retryCounter = 10;
            triggerReconById(email, ewfParentUsernameForEmail);

            while (!foundUser && retryCounter-- > 0) {
              sleepMSecs(200);

              _log('Retrying to get FIDC user, retryCounter = ' + retryCounter);

              foundUser = getUserByUsername(email);
            }

          } else {

            _logDebug('Creating user : ' + email + 'using createUser() strategy');

            foundUser = createUser(email, null, linkTokenUuid, ewfParentUsernameForEmail);
            _logDebug('New User ID: ' + foundUser._id);

          }

          if (foundUser) {
            let newUser = true;
            addConfirmedRelationshipAndEmail(email, emailLang, foundUser, companyInfo, newUser, linkTokenUuid);
            updateUserLinkTokenId(foundUser._id, linkTokenUuid);
          } else {
            _log('No FIDC User created, marking as failed');
            userFailureCount++;
          }

        } else {

          _log('FIDC User found');

          let newUser = false;
          addConfirmedRelationshipAndEmail(email, emailLang, foundUser, companyInfo, newUser, linkTokenUuid);
          updateUserLinkTokenId(foundUser._id, linkTokenUuid);
        }

      }
    } catch (e) {
      userFailureCount++;
      _log('Error processing user : ' + email);
    }
  }

  try {
    if (request.method === 'read' || (request.method === 'action' && request.action === 'read')) {

      timePoint = determineTimePoint();
      responseNextTimePoint = timePoint;

      let incorporationsResponse = getCompanyIncorporations(timePoint, itemsPerPage);
      _logDebug('Incorporations response : ' + incorporationsResponse);

      if (incorporationsResponse) {
        let incorporations = JSON.parse(incorporationsResponse);

        if (incorporations) {
          if (incorporations.links && incorporations.links.next) {
            _logDebug('Incorporations : Links > Next = ' + incorporations.links.next);
            linksNextTimePoint = extractLinksNextTimePoint(incorporations.links.next, '');
          }

          if (incorporations.items) {
            for (let companyIncorpItem of incorporations.items) {
              _logDebug('Received Company : ' + companyIncorpItem.company_number);

              if (companyIncorpItem.transaction_type === 'incorporation' && companyIncorpItem.transaction_status === 'accepted') {
                companyAttemptCount++;
                _logDebug('Processing Accepted Company : ' + companyIncorpItem.company_number + ' (item ' + companyAttemptCount + ')');

                try {
                  let companyInfo = getCompany(companyIncorpItem.company_number);

                  if (!companyInfo) {
                    _logDebug('Company not found: ' + companyIncorpItem.company_number + ', creating.');

                    createCompany(companyIncorpItem);
                    companyInfo = getCompany(companyIncorpItem.company_number);

                    if (companyInfo) {
                      addedCompanies.push(companyInfo);
                    }
                  }

                  if (companyInfo) {
                    let allMembers = companyInfo.members ? companyInfo.members.map(member => {
                      let fullUser = getUserById(member._refResourceId);
                      let companyRelationship = fullUser.memberOfOrg.find(element => (element._refResourceId === companyInfo._id));

                      return {
                        email: fullUser.userName,
                        status: companyRelationship ? companyRelationship._refProperties.membershipStatus : 'n/a'
                      };
                    }) : [];

                    let allMembersEmailsString = allMembers.map(member => {
                      return member.email;
                    }).join(',');

                    try {
                      _logDebug('Getting Company Emails for No : ' + companyIncorpItem.company_number);
                      let emailsResponse = getCompanyEmails(companyIncorpItem.company_number);
                      _logDebug('Emails response : ' + JSON.stringify(emailsResponse));

                      if (emailsResponse && emailsResponse.items) {
                        let emailsUnique = removeDuplicateEmails(emailsResponse.items);

                        _logDebug('Emails (unique) : ' + emailsUnique);
                        _logDebug('Company Members Already : ' + allMembersEmailsString);

                        emailsUnique.forEach(email => {
                          if (allMembersEmailsString.indexOf(email) > -1) {
                            let userObj = allMembers.find(element => (element.email === email));
                            _logDebug('The user with email : ' + email + ' is already a member of company ' + companyInfo.name + ' (' + companyInfo.number + ') - status: ' + userObj.status);

                            outputUsers.push({
                              message: 'The user with email : ' + email + ' is already a member of company ' + companyInfo.name + ' (' + companyInfo.number + ') - status: ' + userObj.status
                            });
                          } else {
                            associateUserWithCompany(email, companyInfo);
                          }
                        });
                      } else {
                        _log('No emails provided to associate with company');
                        _logDebug('No emails provided to associate with company : ' + companyIncorpItem.company_number);
                      }

                    } catch (e) {
                      _log('Error processing company emails : ' + e);
                    }

                    companySuccessCount++;
                  }
                } catch (e) {
                  _log('Error processing company : ' + e);
                  companyFailureCount++;
                }

              }
            }
          }
        }

        if (linksNextTimePoint) {
          // By default, we'll use the links>next timepoint
          responseNextTimePoint = linksNextTimePoint;
        }

        if (companyAttemptCount > 0 && companySuccessCount === 0) {
          // Unless we tried some but none succeeded so something must be wrong, so
          // we don't update the next time point otherwise we'll miss all of these
          _log('None of the company attempts succeeded, resetting the timePoint back to the current instance');
          responseNextTimePoint = timePoint;
        }

        if (companySuccessCount > 0) {
          // If we did manage to update any, then we move onto the next set
          let response = getScrsServiceUser();
          if (response.resultCount === 1) {
            updateScrsServiceUserTimepoint(response.result[0]._id, responseNextTimePoint);
          }
        }
      }
    }

  } catch (e) {
    _log('Error in SCRS processing : ' + e);
    responseMessage = e.toString();
  }

  let response = {
    _id: context.security.authenticationId,
    results: {
      message: responseMessage,
      usedTimePoint: timePoint,
      itemsPerPage: itemsPerPage,
      nextTimePoint: responseNextTimePoint,
      companyAttemptCount: companyAttemptCount,
      companyFailureCount: companyFailureCount,
      companySuccessCount: companySuccessCount,
      userFailureCount: userFailureCount,
      addedCompanies: addedCompanies,
      users: outputUsers
    }
  };

  _log('SCRS returning - ' + JSON.stringify(response));
  return response;

})();
