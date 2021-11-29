(function () {
  _log('SCRS Starting! request = ' + JSON.stringify(request));

  var OBJECT_USER = 'alpha_user';
  var OBJECT_COMPANY = 'alpha_organization';

  let companyIncorporationsEndpoint = 'https://v79uxae8q8.execute-api.eu-west-1.amazonaws.com/mock/submissions';
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
    logger.error('[CHLOG][SCRS] ' + message);
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
      'url': companyIncorporationsEndpoint + '?timepoint=' + incorporationTimepoint,
      'method': 'GET',
      'headers': {
        'Content-Type': 'application/json',
        'Authorization': fetchAuthorizationToken()
      }
    };

    return openidm.action('external/rest', 'call', request);
  }

  function callNotificationJourney (email, link, companyName, companyNumber, isNewUser) {
    let request = {
      'url': amEndpoint + '/am/json/alpha/authenticate?authIndexType=service&authIndexValue=CHSendSCRSNotifications&noSession=true',
      'method': 'POST',
      'forceWrap': true,
      'headers': {
        'Content-Type': 'application/json',
        'CH-Username': idmUsername,
        'CH-Password': idmPassword,
        'Notification-Link': link,
        'Notification-Email': email,
        'Notification-Company-Number': companyNumber,
        'Notification-Company-Name': companyName,
        'New-User': isNewUser
      }
    };

    _log('journey Request:  ' + JSON.stringify(request));
    let journeyResponse = openidm.action('external/rest', 'call', request);
    _log('journey Response:  ' + JSON.stringify(journeyResponse));

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

  function createUser (email, description) {
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

    return openidm.create('managed/' + OBJECT_USER, null, userDetails);
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

    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
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

  if (request.method === 'read' || (request.method === 'action' && request.action === 'read')) {
    let timePoint = determineTimePoint();
    let nextTimePoint = '';
    let paramCompanyNumber = request.additionalParameters.companyNumber;
    let outputUsers = [];
    let addedCompanies = [];

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
          incorporations.items.forEach(companyIncorp => {

            if (companyIncorp.transaction_type === 'incorporation' && companyIncorp.transaction_status === 'accepted') {

              let companyInfo = getCompany(companyIncorp.company_number);

              if (!companyInfo) {
                _log('Company not found: ' + companyIncorp.company_number + ', creating.');

                createCompany(companyIncorp);
                companyInfo = getCompany(companyIncorp.company_number);

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

                let emailsResponse = getCompanyEmails(companyIncorp.company_number);

                if (emailsResponse.items) {
                  emailsResponse.items.forEach(email => {
                    let userLookup = getUserByUsername(email);

                    if (allMembersEmailsString.indexOf(email) > -1) {
                      let userObj = allMembers.find(element => (element.email === email));
                      _log('The user with email : ' + email + ' is already a member of company ' + companyInfo.name + ' (' + companyInfo.number + ') - status: ' + userObj.status);

                      outputUsers.push({
                        message: 'The user with email : ' + email + ' is already a member of company ' + companyInfo.name + ' (' + companyInfo.number + ') - status: ' + userObj.status
                      });
                    } else {
                      _log('The user with email : ' + email + ' is NOT a member of company ' + companyInfo.name + ' (' + companyInfo.number + ')');

                      if (!userLookup) {
                        let createRes = createUser(email);

                        _log('New User ID: ' + createRes._id);
                        _log('Creating CONFIRMED relationship between user ' + createRes._id + ' and company ' + companyInfo.number);

                        addConfirmedRelationshipToCompany(createRes._id, companyInfo._id, companyInfo.name + ' - ' + companyInfo.number);

                        let notificationResponse = callNotificationJourney(email, customUiUrl, companyInfo.name, companyInfo.number, 'true');
                        _log('notification response : ' + JSON.stringify(notificationResponse));

                        outputUsers.push({
                          _id: createRes._id,
                          email: email,
                          companyNumber: companyInfo.number,
                          companyName: companyInfo.name,
                          newUser: true,
                          accountStatus: 'inactive',
                          emailNotification: notificationResponse.code === 200 ? 'success' : 'fail'
                        });
                      } else {
                        _log('UserLookup : ' + JSON.stringify(userLookup, null, 2));
                        _log('User found with email :' + email + ' - Creating CONFIRMED relationship with company ' + companyInfo.number);

                        addConfirmedRelationshipToCompany(userLookup._id, companyInfo._id, companyInfo.name + ' - ' + companyInfo.number);

                        let notificationResponse = callNotificationJourney(email, customUiUrl, companyInfo.name, companyInfo.number, 'false');
                        _log('notification response : ' + JSON.stringify(notificationResponse));

                        outputUsers.push({
                          _id: userLookup._id,
                          email: email,
                          companyNumber: companyInfo.number,
                          companyName: companyInfo.name,
                          newUser: false,
                          accountStatus: userLookup.accountStatus,
                          emailNotification: notificationResponse.code === 200 ? 'success' : 'fail'
                        });
                      }
                    }
                  });
                }
              }
            }
          });
        }
      }

      let response = getScrsServiceUser();
      if (response.resultCount === 1) {
        _log('FOUND IT : ' + response.result[0]);
        updateScrsServiceUserTimepoint(response.result[0]._id, nextTimePoint);
      }
    }

    _log('SCRS Ending!');

    return {
      _id: context.security.authenticationId,
      results: {
        usedTimePoint: timePoint,
        nextTimePoint: nextTimePoint,
        addedCompanies: addedCompanies,
        users: outputUsers
      }
    };
  }
})();
