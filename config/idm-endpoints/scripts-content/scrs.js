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

  var AuthorisationStatus = {
    CONFIRMED: 'confirmed',
    PENDING: 'pending',
    NONE: 'none'
  };

  function _log (message) {
    logger.error('[CHLOG][SCRS] ' + message);
  }

  function formatDate () {
    var date = new Date();

    var result = [];
    var dateArr = [];

    dateArr.push(date.getFullYear());
    dateArr.push(padding(date.getMonth() + 1));
    dateArr.push(padding(date.getDate()));

    result.push(dateArr.join('-'));
    result.push('T');

    var timeArr = [];

    timeArr.push(padding(date.getHours()));
    timeArr.push(padding(date.getMinutes()));
    timeArr.push(padding(date.getSeconds()));

    result.push(timeArr.join(':'));
    result.push('Z');

    return result.join('');
  }

  function padding (num) {
    return num < 10 ? '0' + num : num;
  }

  function getUserById (id) {
    return openidm.read(
      'managed/alpha_user/' + id,
      null,
      ['_id', 'userName', 'telephoneNumber', 'givenName', 'memberOfOrg']
    );
  }

  function getUserByUsername (username) {
    var response = openidm.query(
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

  function getCompany (number) {
    var response = openidm.query(
      'managed/' + OBJECT_COMPANY,
      { '_queryFilter': '/number eq "' + number + '"' },
      ['_id', 'number', 'name', 'authCode', 'status', 'members', 'addressLine1', 'addressLine2',
        'authCodeIsActive', 'jurisdiction', 'locality', 'postalCode', 'region', 'type', 'members']
    );

    if (response.resultCount === 0) {
      return null;
    }

    return response.result[0];
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

  function addConfirmedRelationshipToCompany (subjectId, companyId, companyLabel) {

    // var currentStatusResponse = getStatus(subjectId, companyId);

    // //if the user has a pending relationship with the company, remove it
    // if (currentStatusResponse.status === AuthorisationStatus.PENDING) {
    //     _log("The user has already a PENDING relationship with the company ");
    //     var deleteResponse = deleteRelationship(subjectId, companyId);
    //     if (!deleteResponse.success) {
    //         return {
    //             success: false
    //         }
    //     }
    // }

    var payload = [
      {
        operation: 'add',
        field: '/memberOfOrg/-',
        value: {
          _ref: 'managed/alpha_organization/' + companyId,
          _refProperties: {
            membershipStatus: AuthorisationStatus.CONFIRMED,
            companyLabel: companyLabel,
            inviterId: null,
            inviteTimestamp: null
          }
        }
      }
    ];

    var newObject = openidm.patch(
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

  function minusHours (h) {
    var date = new Date();
    date.setHours(date.getHours() - h);
    return date;
  }

  let date = minusHours(4);

  let defaultTimepoint = [
    date.getFullYear(),
    padding(date.getMonth() + 1),
    padding(date.getDate()),
    padding(date.getHours()),
    padding(date.getMinutes()),
    padding(date.getSeconds()),
    date.getMilliseconds()
  ].join('');

  _log('Starting timepoint: ' + defaultTimepoint);

  let timePoint = request.additionalParameters.timepoint || defaultTimepoint;
  let companyNumber = request.additionalParameters.companyNumber;
  let outputUsers = [];

  if (request.method === 'read' || (request.method === 'action' && request.action === 'read')) {

    let request = {
      'url': companyIncorporationsEndpoint + '?timepoint=' + timePoint,
      'method': 'GET',
      'headers': {
        'Content-Type': 'application/json',
        'Authorization': fetchAuthorizationToken()
      }
    };

    let incorporationsResponse = openidm.action('external/rest', 'call', request);

    let incorporations = JSON.parse(incorporationsResponse);

    if (companyNumber) {
      incorporations = incorporations.filter(inc => {
        return (inc.company_number === companyNumber);
      });
    }

    incorporations.items.forEach(companyIncorp => {

      if (companyIncorp.transaction_type === 'incorporation' && companyIncorp.transaction_status === 'accepted') {

        let companyInfo = getCompany(companyIncorp.company_number);

        if (!companyInfo) {
          _log('Company not found: ' + companyIncorp.company_number + ', skipping.');
        } else {
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

          let request = {
            'url': emailsEndpoint + '?companyNo=' + companyIncorp.company_number,
            'method': 'GET',
            'headers': {
              'Content-Type': 'application/json',
              'Authorization': fetchAuthorizationToken()
            }
          };

          let emailsResponse = openidm.action('external/rest', 'call', request);

          if (emailsResponse.items) {
            emailsResponse.items.forEach(email => {
              let userLookup = getUserByUsername(email);

              if (allMembersEmailsString.indexOf(email) > -1) {
                let userObj = allMembers.find(element => (element.email === email));
                _log('The user with email : ' + email + ' is already a member of company ' + companyInfo.name + ' - status: ' + userObj.status);

                outputUsers.push({
                  message: 'The user with email : ' + email + ' is already a member of company ' + companyInfo.name + ' - status: ' + userObj.status
                });
              } else {
                _log('The user with email : ' + email + ' is NOT a member of company ' + companyInfo.name);

                if (!userLookup) {
                  _log('User does not exist: Creating new user with username ' + email);

                  //var onboardingDate = formatDate();
                  let createRes = openidm.create('managed/' + OBJECT_USER,
                    null,
                    {
                      'userName': email,
                      'sn': email,
                      'mail': email,
                      // "frIndexedDate2": onboardingDate,
                      'accountStatus': 'inactive'
                    });

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

    return {
      _id: context.security.authenticationId,
      results: outputUsers
    };
  }
})();
