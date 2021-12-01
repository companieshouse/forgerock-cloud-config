(function () {
  let logNowMsecs = new Date().getTime();
  _log('SCRS Starting! request = ' + JSON.stringify(request));

  var OBJECT_USER = 'alpha_user';
  var OBJECT_COMPANY = 'alpha_organization';

  let companyIncorporationsEndpoint = 'https://v79uxae8q8.execute-api.eu-west-1.amazonaws.com/mock/submissions';
  let numIncorporationsPerPage = '50';
  let emailsEndpoint = 'https://v79uxae8q8.execute-api.eu-west-1.amazonaws.com/mock/authorisedForgerockEmails';
  let amEndpoint = 'https://openam-companieshouse-uk-dev.id.forgerock.io';
  let customUiUrl = 'https://idam-ui.amido.aws.chdev.org';
  let idmUsername = 'tree-service-user@companieshouse.com';
  let idmPassword = 'Passw0rd123!';
  let idmScrsServiceUsername = 'scrs-service-user@companieshouse.com';

  var AuthorisationStatus = {
    CONFIRMED: 'confirmed',
    PENDING: 'pending',
    NONE: 'none'
  };

  function _log (message) {
    logger.error('[CHLOG][SCRS][' + logNowMsecs + '] ' + message);
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

  function removeDuplicateEmails (data) {
    let emails = [];
    let uniqueSet = [];

    data.forEach(element => {
      if (!emails.includes(element.email)) {
        emails.push(element.email);
        uniqueSet.push(element);
      }
    });

    return uniqueSet;
  }

  function padding (num) {
    return num < 10 ? '0' + num : num;
  }

  function minusHours (h) {
    let date = new Date();
    date.setHours(date.getHours() - h);
    return date;
  }

  function getCompanyIncorporations (incorporationTimepoint) {
    _log('Getting Company Incorporations from timepoint : ' + incorporationTimepoint);

    let request = {
      'url': companyIncorporationsEndpoint + '?timepoint=' + incorporationTimepoint + '&items_per_page=' + numIncorporationsPerPage,
      'method': 'GET',
      'headers': {
        'Content-Type': 'application/json',
        'Authorization': fetchAuthorizationToken()
      }
    };

    return openidm.action('external/rest', 'call', request);
  }

  function callNotificationJourney (email, link, companyName, companyNumber, isNewUser, userId, linkTokenUuid, language) {
    let headers = {
      'Content-Type': 'application/json',
      'CH-Username': idmUsername,
      'CH-Password': idmPassword,
      'Notification-Link': link,
      'Notification-Email': email,
      'Notification-Language': language || 'en',
      'Notification-Company-Number': companyNumber,
      'Notification-Company-Name': companyName,
      'Notification-User-Id': userId,
      'Notification-Token-Uuid': linkTokenUuid,
      'New-User': isNewUser
    };

    let request = {
      'url': amEndpoint + '/am/json/alpha/authenticate?authIndexType=service&authIndexValue=CHSendSCRSNotifications&noSession=true',
      'method': 'POST',
      'forceWrap': true,
      'headers': headers
    };

    _log('Journey Request:  ' + JSON.stringify(request));
    let journeyResponse = openidm.action('external/rest', 'call', request);
    _log('Journey Response:  ' + JSON.stringify(journeyResponse));

    return journeyResponse;
  }

  function fetchAuthorizationToken () {
    //TODO implement authN logic to fetch Bearer token
    return 'Bearer 1234abcde';
  }

  function getUserById (id) {
    return openidm.read(
      'managed/alpha_user/' + id,
      null,
      ['_id', 'userName', 'telephoneNumber', 'givenName', 'memberOfOrg']
    );
  }

  function getUserByUsername (username) {
    let response = openidm.query(
      'managed/' + OBJECT_USER,
      { '_queryFilter': '/userName eq "' + username + '"' },
      ['_id', 'userName', 'givenName', 'roles', 'authzRoles', 'memberOfOrg', 'accountStatus']
    );

    if (response.resultCount !== 1) {
      _log('getUserByUsername: Bad result count: ' + response.resultCount);
      return null;
    }

    return response.result[0];
  }

  function getScrsServiceUser () {
    return openidm.query(
      'managed/' + OBJECT_USER,
      { '_queryFilter': '/userName eq "' + idmScrsServiceUsername + '"' },
      ['_id', 'userName', 'description']
    );
  }

  function getOrCreateScrsServiceUser (initialTimepoint) {
    _log('Initial Timepoint for SCRS Service User : ' + initialTimepoint);

    let response = getScrsServiceUser();
    if (response.resultCount === 0) {
      _log('SCRS Service User not found, creating it');

      createUser(idmScrsServiceUsername, initialTimepoint);

      return openidm.query(
        'managed/' + OBJECT_USER,
        { '_queryFilter': '/userName eq "' + idmScrsServiceUsername + '"' },
        ['_id', 'userName', 'description']
      );
    }

    _log('Found existing SCRS Service User : ' + response.result[0]);

    return response.result[0];
  }

  function updateScrsServiceUserTimepoint (scrsUserId, updatedTimepoint) {
    _log('Updating SCRS Service User Id : ' + scrsUserId + ' with next timePoint of : ' + updatedTimepoint);

    if (scrsUserId && updatedTimepoint) {
      let descriptionUpdate = {
        operation: 'replace',
        field: '/description',
        value: updatedTimepoint
      };

      openidm.patch('managed/' + OBJECT_USER + '/' + scrsUserId,
        null,
        [descriptionUpdate]);

      _log('Updated with next timePoint : ' + updatedTimepoint);
    }
  }

  function createUser (email, description, linkTokenHint) {
    _log('User does not exist: Creating new user with username ' + email);

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

    return openidm.create('managed/' + OBJECT_USER, null, userDetails);
  }

  function updateUserLinkTokenId (userId, linkTokenUuid) {
    _log('Updating User Id : ' + userId + ' with linkTokenUuid of : ' + linkTokenUuid);

    if (userId && linkTokenUuid) {
      let linkTokenUuidUpdate = {
        operation: 'replace',
        field: '/frUnindexedString3',
        value: linkTokenUuid
      };

      openidm.patch('managed/' + OBJECT_USER + '/' + userId,
        null,
        [linkTokenUuidUpdate]);

      _log('Updated with linkTokenUuid : ' + linkTokenUuid);
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
        'authCodeIsActive', 'jurisdiction', 'locality', 'postalCode', 'region', 'type', 'members']
    );

    if (response.resultCount === 0) {
      return null;
    }

    return response.result[0];
  }

  function createCompany (companyIncorp) {
    _log('Creating new company with details : ' + companyIncorp);

    return openidm.create('managed/' + OBJECT_COMPANY,
      null,
      {
        'number': companyIncorp.company_number,
        'name': companyIncorp.company_name,
        'creationDate': fixCreationDate(companyIncorp.incorporated_on)
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
    let request = {
      'url': emailsEndpoint + '?companyNo=' + companyNumber,
      'method': 'GET',
      'headers': {
        'Content-Type': 'application/json',
        'Authorization': fetchAuthorizationToken()
      }
    };

    return openidm.action('external/rest', 'call', request);
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

    _log('Using default timepoint: ' + timePoint);

    let scrsServiceUserDetails = getOrCreateScrsServiceUser(timePoint);

    _log('SCRS Service User : ' + scrsServiceUserDetails);

    if (scrsServiceUserDetails && scrsServiceUserDetails.description) {
      _log('Using timePoint from SCRS Service User : ' + scrsServiceUserDetails.description);

      timePoint = scrsServiceUserDetails.description;
    }

    _log('Final timePoint for Integration Call : ' + timePoint);
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
    _log('Links Next = ' + linksNext);

    if (!linksNext) {
      return defaultValue;
    }

    let timePointParam = getParameterFromUrlByName(linksNext, 'timepoint');

    if (timePointParam) {
      _log('Incorporations Links > Next timePoint : ' + timePointParam);
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
  let nextTimePoint = '';
  let responseNextTimePoint = '';
  let responseMessage = 'OK';

  try {

    if (request.method === 'read' || (request.method === 'action' && request.action === 'read')) {
      let paramCompanyNumber = request.additionalParameters.companyNumber;

      timePoint = determineTimePoint();
      nextTimePoint = '';
      responseNextTimePoint = nextTimePoint;

      let incorporationsResponse = getCompanyIncorporations(timePoint);
      _log('Incorporations response : ' + incorporationsResponse);

      if (incorporationsResponse) {
        let incorporations = JSON.parse(incorporationsResponse);

        if (incorporations) {
          if (paramCompanyNumber) {
            incorporations = incorporations.filter(inc => {
              return (inc.company_number === paramCompanyNumber);
            });
          }

          if (incorporations.links && incorporations.links.next) {
            _log('Incorporations : Links > Next = ' + incorporations.links.next);
            nextTimePoint = extractLinksNextTimePoint(incorporations.links.next, '');
          }

          if (incorporations.items) {
            for (let companyIncorpItem of incorporations.items) {
              _log('Received Company : ' + companyIncorpItem.company_number);

              if (companyIncorpItem.transaction_type === 'incorporation' && companyIncorpItem.transaction_status === 'accepted') {
                companyAttemptCount++;
                _log('Processing Accepted Company : ' + companyIncorpItem.company_number + ' (item ' + companyAttemptCount + ')');

                try {
                  let companyInfo = getCompany(companyIncorpItem.company_number);

                  if (!companyInfo) {
                    _log('Company not found: ' + companyIncorpItem.company_number + ', creating.');

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
                      let emailsResponse = getCompanyEmails(companyIncorpItem.company_number);

                      _log('Emails response : ' + emailsResponse);

                      if (emailsResponse && emailsResponse.items) {
                        let emailsUnique = removeDuplicateEmails(emailsResponse.items);

                        _log('Emails (unique) : ' + emailsUnique);

                        emailsUnique.forEach(emailEntry => {

                          if (!emailEntry.email) {
                            return;
                          }

                          let email = emailEntry.email;
                          let emailLang = emailEntry.language || 'en';

                          try {
                            _log('Processing user with email : ' + email + ', language = ' + emailLang);
                            let userLookup = getUserByUsername(email);

                            if (allMembersEmailsString.indexOf(email) > -1) {
                              let userObj = allMembers.find(element => (element.email === email));
                              _log('The user with email : ' + email + ' is already a member of company ' + companyInfo.name + ' (' + companyInfo.number + ') - status: ' + userObj.status);

                              outputUsers.push({
                                message: 'The user with email : ' + email + ' is already a member of company ' + companyInfo.name + ' (' + companyInfo.number + ') - status: ' + userObj.status
                              });
                            } else {
                              _log('The user with email : ' + email + ' is NOT a member of company ' + companyInfo.name + ' (' + companyInfo.number + ')');

                              let linkTokenUuid = uuidv4();
                              _log('Using UUID : ' + linkTokenUuid + ' for user with email : ', email);

                              if (!userLookup) {
                                let createRes = createUser(email, null, linkTokenUuid);

                                _log('New User ID: ' + createRes._id);
                                _log('Creating CONFIRMED relationship between user ' + createRes._id + ' and company ' + companyInfo.number);

                                addConfirmedRelationshipToCompany(createRes._id, companyInfo._id, companyInfo.name + ' - ' + companyInfo.number);

                                let notificationResponse = callNotificationJourney(email, customUiUrl, companyInfo.name, companyInfo.number, 'true',
                                  createRes._id, linkTokenUuid, emailLang);

                                _log('notification response : ' + JSON.stringify(notificationResponse));

                                outputUsers.push({
                                  _id: createRes._id,
                                  email: email,
                                  companyNumber: companyInfo.number,
                                  companyName: companyInfo.name,
                                  newUser: true,
                                  accountStatus: 'inactive',
                                  emailNotification: notificationResponse.code === 200 ? 'success' : 'fail',
                                  message: 'The user with email : ' + email + ' has been added as a member of company ' + companyInfo.name + ' (' + companyInfo.number + ') - status: confirmed'
                                });
                              } else {
                                _log('UserLookup : ' + JSON.stringify(userLookup, null, 2));
                                _log('User found with email :' + email + ' - Creating CONFIRMED relationship with company ' + companyInfo.number);

                                addConfirmedRelationshipToCompany(userLookup._id, companyInfo._id, companyInfo.name + ' - ' + companyInfo.number);

                                if (!userLookup.frUnindexedString3) {
                                  updateUserLinkTokenId(userLookup._id, linkTokenUuid);
                                }

                                let notificationResponse = callNotificationJourney(email, customUiUrl, companyInfo.name, companyInfo.number, 'false',
                                  userLookup._id, linkTokenUuid, emailLang);

                                _log('notification response : ' + JSON.stringify(notificationResponse));

                                outputUsers.push({
                                  _id: userLookup._id,
                                  email: email,
                                  companyNumber: companyInfo.number,
                                  companyName: companyInfo.name,
                                  newUser: false,
                                  accountStatus: userLookup.accountStatus,
                                  emailNotification: notificationResponse.code === 200 ? 'success' : 'fail',
                                  message: 'The user with email : ' + email + ' has been added as a member of company ' + companyInfo.name + ' (' + companyInfo.number + ') - status: confirmed'
                                });
                              }
                            }
                          } catch (e) {
                            userFailureCount++;
                            _log('Error processing user : ' + email);
                          }
                        });
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

        responseNextTimePoint = nextTimePoint;

        if (companyAttemptCount > 0 && companySuccessCount === 0) {
          // We tried some, but none succeeded so something must be wrong, so
          // we don't update the next time point
          _log('None of the company attempts succeeded, resetting the timePoint back to the current instance');
          responseNextTimePoint = timePoint;
        }

        if (companySuccessCount > 0) {
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
