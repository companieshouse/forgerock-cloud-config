(function () {

  // Configuration constants
  const logNowMsecs = new Date().getTime();
  var OBJECT_USER = 'alpha_user';
  var OBJECT_COMPANY = 'alpha_organization';
  var USER_RELATIONSHIP = 'memberOfOrg';
  var INTERNAL_IDM_ADMIN = 'internal/role/openidm-admin';

  // Values for the memberOfOrg/members relationship property "status"

  var AuthorisationStatus = {
    CONFIRMED: 'confirmed',
    PENDING: 'pending',
    NONE: 'none'
  };

  var InviteActions = {
    ACCEPT: 'accept',
    DECLINE: 'decline'
  };

  var CompanyStatus = {
    ACTIVE: 'active',
    DORMANT: 'dormant',
    DISSOLVED: 'dissolved'
  };

  // Endpoint actions

  var RequestAction = {
    GET_STATUS_BY_USERNAME: 'getCompanyStatusByUsername',
    GET_STATUS_BY_USERID: 'getCompanyStatusByUserId',
    INVITE_USER_BY_USERNAME: 'inviteUserByUsername',
    INVITE_USER_BY_USERID: 'inviteUserByUserId',
    GET_COMPANY: 'getCompanyByNumber',
    RESPOND_INVITE: 'respondToInvite',
    REMOVE_AUTHORISED_USER: 'removeAuthorisedUser',
    ADD_AUTHORISED_USER: 'addAuthorisedUser'
  };

  // Debug loggers

  function log (message) {
    logger.error('[CHLOG][COMPANYAUTH][' + new Date(logNowMsecs).toISOString() + '] ' + message);
  }

  function logResponse (response) {
    log('Got response ' + response);
  }

  // Fetch current status for user vs. company
  function getStatus (userId, companyId) {

    var status = AuthorisationStatus.NONE;
    var membership = null;
    var inviterId = null;
    var inviteTimestamp = null;
    var relationshipEntry;

    var response = openidm.query('managed/' + OBJECT_USER + '/' + userId + '/' + USER_RELATIONSHIP,
      { '_queryFilter': 'true' },
      ['_refProperties/membershipStatus']);

    //logResponse('IDM User membershipStatus found: ' + response);

    if (response.resultCount === 0) {
      log('[GET STATUS] No companies currently authorised for user ' + userId);
    } else {
      response.result.forEach(function (entry) {
        if (entry._refResourceId === companyId) {
          status = entry._refProperties.membershipStatus;
          inviterId = entry._refProperties.inviterId;
          inviteTimestamp = entry._refProperties.inviteTimestamp;
          log('Got a match for company ' + companyId + 'and userId : ' + userId + ': membership status: ' + status);
          membership = entry._id;
          relationshipEntry = entry;
        }
      });
    }

    return {
      status: status,
      entry: relationshipEntry,
      membership: membership,
      inviterId: inviterId,
      inviteTimestamp: inviteTimestamp
    };

  }

  // deletes the relationship between the given user and given copmpany if in PENDING status
  function deleteRelationship (subjectId, companyId) {
    var currentStatusResponse = getStatus(subjectId, companyId);

    log('[DELETE RELATIONSHIP] Deleting relationship with company ' + companyId + ' from user ' + subjectId);
    log('[DELETE RELATIONSHIP] patching: ' + 'managed/' + OBJECT_USER + '/' + subjectId);

    if(!currentStatusResponse.status){
      return {
        success: false,
        message: 'No relationship with company ' + companyId + ' could be found for the user ' + subjectId
      };
    }
    
    var payload = [
      {
        operation: 'remove',
        field: '/memberOfOrg',
        value: {
          _ref: currentStatusResponse.entry._ref,
          _refResourceCollection: currentStatusResponse.entry._refResourceCollection,
          _refResourceId: currentStatusResponse.entry._refResourceId,
          _refProperties: currentStatusResponse.entry._refProperties
        }
      }
    ];

    var newObject = openidm.patch('managed/' + OBJECT_USER + '/' + subjectId,
      null,
      payload);

    // check that the relationship has been removed from the user
    if (JSON.stringify(newObject.memberOfOrgIDs).indexOf(currentStatusResponse.entry._refResourceId) > -1) {
      log('[DELETE RELATIONSHIP] The relationship with company ' + companyId + ' could not be removed from the user ' + subjectId);
      return {
        success: false,
        message: 'The relationship with company ' + companyId + ' could not be removed from the user ' + subjectId
      };
    } else {
      log('[DELETE RELATIONSHIP] Relationship with company ' + companyId + ' removed from user ' + subjectId);
    }

    return {
      success: true
    };
  }

  // adds a CONFIRMED relationship between the provided user and company, and replaces it if there's one in PENDING status already
  function addConfirmedRelationshipToCompany (subjectId, companyId, companyLabel) {

    log('[ADD CONFIRMED RELATIONSHIP] Adding CONFIRMED relationship between company ' + companyLabel + ' and user ' + subjectId);

    var currentStatusResponse = getStatus(subjectId, companyId);

    //if the user has a pending relationship with the company, remove it
    if (currentStatusResponse.status === AuthorisationStatus.PENDING) {
      log('[ADD CONFIRMED RELATIONSHIP] The user ' + subjectId + ' has already a PENDING relationship with the company ' + companyLabel + ' - Removing it...');
      var deleteResponse = deleteRelationship(subjectId, companyId);
      if (!deleteResponse.success) {
        log('[ADD CONFIRMED RELATIONSHIP] PENDING relationship between user ' + subjectId + ' and company ' + companyLabel + ' could NOT be removed');
        return {
          success: false
        };
      } else {
        log('[ADD CONFIRMED RELATIONSHIP] PENDING relationship between user ' + subjectId + ' and company ' + companyLabel + ' has been removed');
      }
    }

    //log('[ADD CONFIRMED RELATIONSHIP] Got status - ' + JSON.stringify(currentStatusResponse));

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

    log('[ADD CONFIRMED RELATIONSHIP] Patch URL = ' + 'managed/' + OBJECT_USER + '/' + subjectId);
    log('[ADD CONFIRMED RELATIONSHIP] Payload = ' + JSON.stringify(payload));

    var newObject = null;

    try {
      newObject = openidm.patch('managed/' + OBJECT_USER + '/' + subjectId,
        null,
        payload);
    } catch (e) {
      log('[ADD CONFIRMED RELATIONSHIP] Error occurred during PATCH of CONFIRMED relationship between user ' + subjectId + ' and company ' + companyLabel + ' : ' + e);
    }

    log('[ADD CONFIRMED RELATIONSHIP] newObject = ' + newObject);

    if (newObject) {
      if (!newObject.memberOfOrgIDs || JSON.stringify(newObject.memberOfOrgIDs).indexOf(companyId) > -1) {
        log('[ADD CONFIRMED RELATIONSHIP] Successfully created CONFIRMED relationship between user ' + subjectId + ' and company ' + companyLabel);
        return {
          success: true
        };
      }
    }

    log('[ADD CONFIRMED RELATIONSHIP] Error occurred while adding CONFIRMED relationship between user ' + subjectId + ' and company ' + companyLabel + ' : ' + e);
    return {
      success: false,
      message: 'The relationship with company ' + companyId + ' could not be added to the user'
    };
  }

  // Update status for user vs. company
  function setStatus (callerId, subjectId, companyId, companyLabel, newStatus) {
    log('[SET STATUS] Setting status ' + newStatus + ' between company ' + companyId + ' and user ' + subjectId);
    var currentStatusResponse = getStatus(subjectId, companyId);
    if (currentStatusResponse.status === AuthorisationStatus.NONE) {
      log('[SET STATUS] Creating new relationship for company ' + companyId + ' with status ' + newStatus);
      openidm.create('managed/' + OBJECT_USER + '/' + subjectId + '/' + USER_RELATIONSHIP,
        null,
        {
          '_ref': 'managed/' + OBJECT_COMPANY + '/' + companyId,
          '_refProperties': {
            'membershipStatus': newStatus,
            'inviterId': callerId,
            'inviteTimestamp': formatDate(),
            'companyLabel': companyLabel
          }
        });
    } else if (currentStatusResponse.status === newStatus) {
      if (currentStatusResponse.status === AuthorisationStatus.PENDING) {
        log('[SET STATUS] Status already PENDING for company ' + companyId + ' and user ' + subjectId + ' : updating invite timestamp');
        inviteTimestampUpdate = {
          operation: 'replace',
          field: '/_refProperties/inviteTimestamp',
          value: formatDate()
        };
        openidm.patch('managed/' + OBJECT_USER + '/' + subjectId + '/' + USER_RELATIONSHIP + '/' + currentStatusResponse.membership,
          null,
          [inviteTimestampUpdate]);
      }
    } else {
      log('[SET STATUS] Updating status from ' + currentStatusResponse.status + ' to ' + newStatus + ' for company ' + companyId);

      var statusUpdate = {
        operation: 'replace',
        field: '/_refProperties/membershipStatus',
        value: newStatus
      };

      var inviterUpdate = {
        operation: 'replace',
        field: '/_refProperties/inviterId',
        value: callerId
      };

      var inviteTimestampUpdate = {
        operation: 'replace',
        field: '/_refProperties/inviteTimestamp',
        value: formatDate()
      };

      // update the 'inviterId' and 'inviteTimestamp' relationship property only when an invitation is created, do not override them when invite is accepted
      var newobject = openidm.patch('managed/' + OBJECT_USER + '/' + subjectId + '/' + USER_RELATIONSHIP + '/' + currentStatusResponse.membership,
        null,
        (newStatus === AuthorisationStatus.CONFIRMED) ? [statusUpdate] : [statusUpdate, inviterUpdate, inviteTimestampUpdate]);
    }

    log('[SET STATUS] Status updated from ' + currentStatusResponse.status + ' to ' + newStatus + ' for company ' + companyId);
    return {
      success: true,
      oldStatus: currentStatusResponse.status
    };
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

  function getUserByUsername (username) {
    var response = openidm.query('managed/' + OBJECT_USER,
      { '_queryFilter': '/userName eq "' + username + '"' },
      ['_id', 'userName', 'givenName', 'roles', 'authzRoles', 'memberOfOrg', 'memberOfOrgIDs']);

    if (response.resultCount !== 1) {
      //log('getUserByUsername - Bad result count: ' + response.resultCount);
      return null;
    }

    return response.result[0];
  }

  function getUserById (userId) {
    var response = openidm.query('managed/' + OBJECT_USER,
      { '_queryFilter': '/_id eq "' + userId + '"' },
      ['_id', 'userName', 'givenName', 'roles', 'authzRoles', 'memberOfOrg', 'memberOfOrgIDs']);

    if (response.resultCount !== 1) {
      //log('getUserById - Bad result count: ' + response.resultCount);
      return null;
    }

    return response.result[0];
  }

  function getCompany (number) {
    var response = openidm.query('managed/' + OBJECT_COMPANY,
      { '_queryFilter': '/number eq "' + number + '"' },
      ['_id', 'number', 'name', 'authCode', 'status', 'members', 'addressLine1', 'addressLine2',
        'jurisdiction', 'locality', 'postalCode', 'region', 'type']);

    if (response.resultCount === 0) {
      //log('getCompany - Bad result count: ' + response.resultCount);
      return null;
    }

    return response.result[0];
  }

  function allowInviteAcceptance (callerStatus, subjectStatus, newStatus, isCallerAdminUser, isMe) {
    log('[ACCEPT INVITE AUTHZ CHECK] callerStatus ' + callerStatus + ', subjectStatus ' + subjectStatus + ', newStatus ' + newStatus + ', isAdminUser ' + isCallerAdminUser + ', isMe ' + isMe);

    if (subjectStatus === AuthorisationStatus.NONE) {
      return {
        message: 'The subject does not have a relationship with the company.',
        allowed: false
      };
    }

    if (isCallerAdminUser &&
      subjectStatus === AuthorisationStatus.PENDING &&
      newStatus === AuthorisationStatus.CONFIRMED) {
      log('[ACCEPT INVITE AUTHZ CHECK] Caller is admin - changing from \'' + subjectStatus + '\' to \'' + newStatus + '\' allowed');
      return {
        allowed: true
      };
    }

    // if caller is also subject, and the current status is PENDING and the target is CONFIRMED
    if (isMe &&
      subjectStatus === AuthorisationStatus.PENDING &&
      newStatus === AuthorisationStatus.CONFIRMED) {
      log('[ACCEPT INVITE AUTHZ CHECK] Caller is also subject - changing from \'' + subjectStatus + '\' to \'' + newStatus + '\' allowed');
      return {
        allowed: true
      };
    }

    // if caller is authorised, allow subject transition from NONE to PENDING
    if (callerStatus === AuthorisationStatus.CONFIRMED &&
      subjectStatus === AuthorisationStatus.PENDING &&
      newStatus === AuthorisationStatus.CONFIRMED) {
      log('[ACCEPT INVITE AUTHZ CHECK] Caller is already authorised - changing subject relationship from PENDING to CONFIRMED: status change allowed');
      return {
        allowed: true
      };
    }

    // if caller is authorised, deny subject transition from PENDING to PENDING
    if (callerStatus === AuthorisationStatus.CONFIRMED &&
      subjectStatus === AuthorisationStatus.CONFIRMED &&
      newStatus === AuthorisationStatus.CONFIRMED) {
      log('[ACCEPT INVITE AUTHZ CHECK] Caller is already authorised - subject status for company is already CONFIRMED - Status change NOT allowed');
      return {
        message: 'The subject is already authorised for the company.',
        allowed: false
      };
    }

    // for any other combination, deny the request
    return {
      message: 'Caller is not authorised for the company, is not an admin or is not the subject.',
      allowed: false
    };
  }

  // Authorisation logic to allow a user (caller) to remove an authorised/invited from a Company
  function allowUserRemoval (callerStatus, callerId, subjectStatus, subjectInviterId, isCallerAdminUser, isMe) {
    log('[REMOVE USER AUTHZ CHECK] callerStatus ' + callerStatus + ', subjectStatus ' + subjectStatus + ', isAdminUser ' + isCallerAdminUser + ', isMe ' + isMe);

    // if the caller is an admin and the subject is CONFIRMED, allow the removal
    if (isCallerAdminUser) {
      log('allowUserRemoval - Caller is admin - changing from \'' + subjectStatus + '\' to \'NONE\' allowed');
      return {
        allowed: true
      };
    }

    // if the caller is a company authorised user and and the subject is also authorised, allow the removal
    if (callerStatus === AuthorisationStatus.CONFIRMED &&
      (subjectStatus === AuthorisationStatus.CONFIRMED || subjectStatus === AuthorisationStatus.PENDING)) {
      log('[REMOVE USER AUTHZ CHECK] Caller is authorised for the company - changing from \'' + subjectStatus + '\' to \'NONE\' allowed');
      return {
        allowed: true
      };
    }

    // the user we are trying to remove from a company does not actually have a relationship with the company
    if (subjectStatus === AuthorisationStatus.NONE) {
      log('[REMOVE USER AUTHZ CHECK] The subject does not have a relationship with the company - removal not possible.');
      return {
        message: 'The subject does not have a relationship with the company - removal not possible.',
        allowed: false
      };
    }

    // for any other combination, deny the request
    log('[REMOVE USER AUTHZ CHECK] Remove user not allowed - Possible failure reasons: Caller is not authorised for the company, subject is invited, caller is not an admin user.');
    return {
      message: 'Possible failure reasons: Caller is not authorised for the company, subject is invited, caller is not an admin user.',
      allowed: false
    };
  }

  // Authorisation logic to allow a user (caller) to add an authorised/invited to a Company: only possible if the user has an auth code
  function allowUserAdd (callerStatus, subjectStatus, isCallerAdminUser) {
    log('[ADD USER AUTHZ CHECK] callerStatus ' + callerStatus + ', subjectStatus ' + subjectStatus + ', isAdminUser ' + isCallerAdminUser);

    // if the caller is an admin and the subject is CONFIRMED, allow the removal
    if (isCallerAdminUser) {
      log('[ADD USER AUTHZ CHECK] Caller is admin - changing from \'' + subjectStatus + '\' to \'CONFIRMED\' allowed');
      return {
        allowed: true
      };
    }

    log('[ADD USER AUTHZ CHECK] Add user not allowed - Possible failure reasons: Caller is not an admin user.');
    // for any other combination, deny the request
    return {
      message: 'Possible failure reasons: Caller is not an admin user.',
      allowed: false
    };
  }

  // Authorisation logic to allow a user (caller) to decline an invitation to become authorised for a Company
  function allowInviteDecline (callerStatus, subjectStatus, isCallerAdminUser, isMe) {
    log('[DECLINE INVITE AUTHZ CHECK] callerStatus ' + callerStatus + ', subjectStatus ' + subjectStatus + ', isAdminUser ' + isCallerAdminUser + ', isMe ' + isMe);

    if (subjectStatus === AuthorisationStatus.NONE) {
      return {
        message: 'The subject does not have a relationship with the company.',
        allowed: false
      };
    }

    if (isCallerAdminUser &&
      subjectStatus === AuthorisationStatus.PENDING) {
      log('[DECLINE INVITE AUTHZ CHECK] Caller is admin - deleting relationship in status \'' + subjectStatus + '\' allowed');
      return {
        allowed: true
      };
    }

    // if caller is also subject, and the current status is PENDING and the target is CONFIRMED
    if (isMe &&
      subjectStatus === AuthorisationStatus.PENDING) {
      log('[DECLINE INVITE AUTHZ CHECK] Caller is also subject - deleting relationship in status \'' + subjectStatus + '\' allowed');
      return {
        allowed: true
      };
    }

    // if caller is authorised, allow subject transition from NONE to PENDING
    if (callerStatus === AuthorisationStatus.CONFIRMED &&
      subjectStatus === AuthorisationStatus.PENDING) {
      log('[DECLINE INVITE AUTHZ CHECK] Caller is already authorised - deleting relationship in status PENDING allowed');
      return {
        allowed: true
      };
    }

    log('[DECLINE INVITE AUTHZ CHECK] Caller is not authorised for the company, is not an admin or is not the subject.');
    // for any other combination, deny the request
    return {
      message: 'Caller is not authorised for the company, is not an admin or is not the subject.',
      allowed: false
    };
  }

  // Authorisation logic to allow a user (caller) to send an invite to another user (subject) to become authorised for a Company
  function allowInviteSending (callerStatus, subjectStatus, newStatus, isCallerAdminUser, isMe) {

    log('[INVITE AUTHZ CHECK] callerStatus ' + callerStatus + ' subjectStatus ' + subjectStatus + ' newStatus ' + newStatus + ' isAdminUser ' + isCallerAdminUser + ' isMe ' + isMe);

    // if the caller is an admin, allow to invite any user to any company
    if (isCallerAdminUser) {
      log('[INVITE AUTHZ CHECK] Caller is admin - changing from \'' + subjectStatus + '\' to \'' + newStatus + '\' allowed');
      return {
        allowed: true
      };
    }

    // if caller is authorised, allow subject transition from NONE to PENDING
    if (callerStatus === AuthorisationStatus.CONFIRMED &&
      subjectStatus === AuthorisationStatus.NONE &&
      newStatus === AuthorisationStatus.PENDING) {
      log('[INVITE AUTHZ CHECK] Caller is already authorised - changing subject relationship from NONE to PENDING: status change allowed');
      return {
        allowed: true
      };
    }

    // if caller is authorised, allow subject transition from PENDING to PENDING
    if (callerStatus === AuthorisationStatus.CONFIRMED &&
      subjectStatus === AuthorisationStatus.PENDING &&
      newStatus === AuthorisationStatus.PENDING) {
      log('[INVITE AUTHZ CHECK] Caller is already authorised - subject status for company is already PENDING - Status change allowed');
      return {
        allowed: true
      };
    }

    // if caller is authorised, deny subject transition from NONE to PENDING
    if (callerStatus === AuthorisationStatus.CONFIRMED &&
      subjectStatus === AuthorisationStatus.CONFIRMED &&
      newStatus === AuthorisationStatus.PENDING) {
      log('[INVITE AUTHZ CHECK] Caller is already authorised - subject status for company is already CONFIRMED, cannot set it to PENDING');
      return {
        allowed: false,
        message: 'subject status for company is already CONFIRMED, cannot set it to PENDING'
      };
    }

    log('[INVITE AUTHZ CHECK] Caller is not authorised for the company, is not an admin, or the state transition is not allowed');
    // for any other combination, deny the request
    return {
      message: 'Caller is not authorised for the company, is not an admin, or the state transition is not allowed',
      allowed: false
    };

  }

  function mapCompanyMembers (companyId, members) {
    let mapped = [];
    members.forEach(member => {
      let fullUser = getUserById(member._refResourceId);
      let status = fullUser.memberOfOrg.find(element => (element._refResourceId === companyId));
      mapped.push({
        _id: fullUser._id,
        name: fullUser.givenName,
        email: fullUser.userName,
        membershipStatus: status ? status._refProperties.membershipStatus : AuthorisationStatus.NONE
      });
    });
    return mapped;
  }

  // ************************************
  // ************ Entrypoint ************
  // ************************************

  log('Incoming request: ACTION: ' + request.action + ' - CONTENT: ' + request.content);

  var actor;
  var subject;
  var isMe = false;
  if (request.content.callerId) {
    actor = getUserById(request.content.callerId);
  } else {
    actor = getUserById(context.security.authenticationId);
  }
  log('Caller Id: ' + actor._id + ' (username: ' + actor.userName + ')');

  var isCallerAdminUser = JSON.stringify(actor.authzRoles).indexOf(INTERNAL_IDM_ADMIN) !== -1;
  log('Is Caller an Admin (openidm-admin role): ' + isCallerAdminUser);

  if (!request.action) {
    log('No action');
    throw {
      code: 400,
      message: 'Bad request - no _action parameter'
    };
  }

  var company = getCompany(request.content.companyNumber);
  if (!company) {
    log('Company could not be found: ' + request.content.companyNumber);
    throw {
      code: 404,
      message: 'Company could not be found: ' + request.content.companyNumber
    };
  }

  var companyLabel = company.name + ' - ' + company.number;
  var companyId = company._id;
  log('Company found: ' + companyLabel);

  //do not lookup subject for the GET_COMPANY user
  if (request.action !== RequestAction.GET_COMPANY) {
    if (request.content.subjectId) {
      subject = getUserById(request.content.subjectId);
    } else if (request.content.subjectUserName) {
      subject = getUserByUsername(request.content.subjectUserName);
    }

    if (!subject) {
      log('[GET COMPANY ACTION] User could not be found: ' + (request.content.subjectUserName ? request.content.subjectUserName : request.content.subjectId));
      throw {
        code: 404,
        message: '[GET COMPANY ACTION] User could not be found: ' + (request.content.subjectUserName ? request.content.subjectUserName : request.content.subjectId)
      };
    }

    log('[GET COMPANY ACTION] User found: _id: ' + subject._id + 'userName: ' + subject.userName);
  }

  if (subject && actor) {
    isMe = (subject._id === actor._id);
    log('User acting as SELF: ' + isMe + ' - _id: ' + subject._id)
  }

  // GET MEMBERSHIP STATUS BY USERNAME AND COMPANY NUMBER
  if (request.action === RequestAction.GET_STATUS_BY_USERNAME) {

    log('[GET STATUS BY USERNAME ACTION] Request to read subject company membership status by userName');

    log('[GET STATUS BY USERNAME ACTION] Caller Id: ' + actor._id + '(subjectUserName: ' + actor.userName + ')');

    if (!request.content.subjectUserName || !request.content.companyNumber) {
      log('[GET STATUS BY USERNAME ACTION] Invalid parameters - Expected: subjectUserName, companyNumber');
      throw {
        code: 400,
        message: 'Invalid Parameters - Expected: subjectUserName, companyNumber'
      };
    }

    statusResponse = getStatus(subject._id, companyId);
    log('Membership status: ' + JSON.stringify(statusResponse));

    return {
      success: true,
      caller: {
        id: actor._id,
        userName: actor.userName,
        fullName: actor.givenName
      },
      subject: {
        id: subject._id,
        userName: subject.userName,
        fullName: subject.givenName
      },
      company: {
        id: companyId,
        number: request.content.companyNumber,
        name: company.name,
        status: statusResponse.status,
        inviterId: statusResponse.inviterId,
        inviteTimestamp: statusResponse.inviteTimestamp
      }
    };

  }
  // GET MEMBERSHIP STATUS BY USERID AND COMPANY NUMBER
  else if (request.action === RequestAction.GET_STATUS_BY_USERID) {

    log('[GET STATUS BY USERID ACTION] Request to read subject company membership status by userId');

    if (!request.content.subjectId || !request.content.companyNumber) {
      log('[GET STATUS BY USERID ACTION] Invalid parameters - Expected: subjectId, companyNumber');
      throw {
        code: 400,
        message: 'Invalid Parameters - Expected: subjectId, companyNumber'
      };
    }

    statusResponse = getStatus(subject._id, companyId);
    log('[GET STATUS BY USERID ACTION] Membership status: ' + JSON.stringify(statusResponse));

    return {
      success: true,
      caller: {
        id: actor._id,
        userName: actor.userName,
        fullName: actor.givenName
      },
      subject: {
        id: subject._id,
        userName: subject.userName,
        fullName: subject.givenName
      },
      company: {
        id: companyId,
        number: request.content.companyNumber,
        name: company.name,
        status: statusResponse.status,
        inviterId: statusResponse.inviterId,
        inviteTimestamp: statusResponse.inviteTimestamp
      }
    };
  }
  // SET MEMBERSHIP STATUS
  else if (request.action === RequestAction.INVITE_USER_BY_USERID) {

    log('[INVITE USER BY USERID ACTION] Request to set membership status request to PENDING (send invitation) by userId');

    if (!request.content.subjectId || !request.content.companyNumber) {
      log('[INVITE USER BY USERID ACTION] Invalid parameters - Expected: subjectId, companyNumber');
      throw {
        code: 400,
        message: 'Invalid Parameters - Expected: subjectId, companyNumber'
      };
    }

    // Authorisation check
    subjectStatus = getStatus(subject._id, companyId).status;
    callerStatus = (isMe) ? subjectStatus : getStatus(actor._id, companyId).status;
    newStatus = AuthorisationStatus.PENDING;

    statusChangeAllowedResult = allowInviteSending(callerStatus, subjectStatus, newStatus, isCallerAdminUser, isMe);
    if (!statusChangeAllowedResult.allowed) {
      log('[INVITE USER BY USERID ACTION] Action blocked: add relationship to company - action performed by ' + actor._id + ' - message: ' + statusChangeAllowedResult.message);
      throw {
        code: 403,
        message: 'Action blocked: add relationship to company',
        detail: {
          reason: statusChangeAllowedResult.message
        }
      };
    } else {
      log('[INVITE USER BY USERID ACTION] status change allowed = ' + JSON.stringify(statusChangeAllowedResult));
    }

    try {
      statusResponse = setStatus(actor._id, subject._id, companyId, companyLabel, AuthorisationStatus.PENDING);
    } catch (e) {
      log('[INVITE USER BY USERID ACTION] status update failed - ' + e);
      throw {
        code: 400,
        message: 'Invite user by userid - status update failed - ' + e,
        detail: {
          reason: 'Invite user by userid - status update failed - ' + e
        }
      };
    }

    log('[INVITE USER BY USERID ACTION] success');

    return {
      success: statusResponse.success,
      caller: {
        id: actor._id,
        userName: actor.userName,
        fullName: actor.givenName
      },
      subject: {
        id: subject._id,
        userName: subject.userName,
        fullName: subject.givenName
      },
      company: {
        id: companyId,
        number: request.content.companyNumber,
        name: company.name,
        status: AuthorisationStatus.PENDING,
        previousStatus: statusResponse.oldStatus
      }
    };

  } else if (request.action === RequestAction.INVITE_USER_BY_USERNAME) {

    log('[INVITE USER BY USERNAME ACTION] Request to set membership status to PENDING (send invitation) by subject userName');

    if (!request.content.subjectUserName || !request.content.companyNumber) {
      log('[INVITE USER BY USERNAME ACTION] Invalid parameters - Expected: subjectUserName, companyNumber');
      throw {
        code: 400,
        message: 'Invalid Parameters - Expected: subjectUserName, companyNumber'
      };
    }

    // Authorisation check
    var subjectStatus = getStatus(subject._id, companyId).status;
    var callerStatus = getStatus(actor._id, companyId).status;
    var newStatus = AuthorisationStatus.PENDING;

    statusChangeAllowedResult = allowInviteSending(callerStatus, subjectStatus, newStatus, isCallerAdminUser, isMe);
    if (!statusChangeAllowedResult.allowed) {
      log('[INVITE USER BY USERNAME ACTION] Blocked status update by user ' + actor._id);
      throw {
        code: 403,
        message: 'status update denied',
        detail: {
          reason: statusChangeAllowedResult.message
        }
      };
    } else {
      log('[INVITE USER BY USERNAME ACTION] status change allowed = ' + JSON.stringify(statusChangeAllowedResult));
    }

    var statusResponse;
    try {
      statusResponse = setStatus(actor._id, subject._id, companyId, companyLabel, AuthorisationStatus.PENDING);
    } catch (e) {
      log('[INVITE USER BY USERNAME ACTION] status update failed - ' + e);
      throw {
        code: 400,
        message: 'Invite user by username - status update failed - ' + e,
        detail: {
          reason: 'Invite user by username - status update failed - ' + e
        }
      };
    }

    log('[INVITE USER BY USERNAME ACTION] success');

    return {
      success: statusResponse.success,
      caller: {
        id: actor._id,
        userName: actor.userName,
        fullName: actor.givenName
      },
      subject: {
        id: subject._id,
        userName: subject.userName,
        fullName: subject.givenName
      },
      company: {
        id: companyId,
        number: request.content.companyNumber,
        name: company.name,
        status: AuthorisationStatus.PENDING,
        previousStatus: statusResponse.oldStatus
      }
    };

  } else if (request.action === RequestAction.GET_COMPANY) {

    log('[GET COMPANY DATA ACTION] Request to get company data');

    if (!request.content.companyNumber) {
      log('[GET COMPANY DATA ACTION] Invalid parameters - Expected: companyNumber');
      throw {
        code: 400,
        message: 'Invalid Parameters - Expected: companyNumber'
      };
    }

    var ignoreCompanyAttributes = 'true' === request.content.ignoreCompanyAttributes;

    if (!ignoreCompanyAttributes) {
      if (company.authCode == null) {
        return {
          success: false,
          message: 'No auth code associated with company ' + request.content.companyNumber
        };
      }

      if (company.status === CompanyStatus.DISSOLVED) {
        return {
          success: false,
          message: 'The company ' + request.content.companyNumber + ' is dissolved.'
        };
      }
    }

    return {
      success: true,
      caller: {
        id: actor._id,
        userName: actor.userName,
        fullName: actor.givenName
      },
      company: {
        _id: company._id,
        name: company.name,
        number: company.number,
        authCode: company.authCode,
        jurisdiction: company.jurisdiction,
        status: company.status,
        type: company.type,
        addressLine1: company.addressLine1,
        addressLine2: company.addressLine2,
        region: company.region,
        locality: company.locality,
        postalCode: company.postalCode,
        members: mapCompanyMembers(company._id, company.members)
      }
    };
  } else if (request.action === RequestAction.RESPOND_INVITE) {

    log('[RESPOND INVITE ACTION] Request to respond to an invite (accept/decline)');

    if (!request.content.subjectId || !request.content.companyNumber || !request.content.action) {
      log('[RESPOND INVITE ACTION] Invalid parameters - Expected: subjectId, companyNumber, action');
      throw {
        code: 400,
        message: 'Invalid Parameters - Expected: subjectId, companyNumber, action'
      };
    }

    if (request.content.action !== InviteActions.ACCEPT && request.content.action !== InviteActions.DECLINE) {
      log('[RESPOND INVITE ACTION] Invalid parameters - The actions allowed on an invitation can only be \'accept\' or \'decline\'');
      throw {
        code: 400,
        message: 'Invalid Parameters - The actions allowed on an invitation can only be \'accept\' or \'decline\''
      };
    }

    // Authorisation check
    subjectStatus = getStatus(subject._id, companyId).status;
    subjectInviterId = getStatus(subject._id, companyId).inviterId;
    callerStatus = getStatus(actor._id, companyId).status;

    if (request.content.action === InviteActions.ACCEPT) {
      newStatus = AuthorisationStatus.CONFIRMED;

      log('[RESPOND INVITE ACTION - ACCEPT] Request to set membership status to CONFIRMED (accept invite)');
      statusChangeAllowedResult = allowInviteAcceptance(callerStatus, subjectStatus, newStatus, isCallerAdminUser, isMe);
      if (!statusChangeAllowedResult.allowed) {
        log('[RESPOND INVITE ACTION - ACCEPT] Action blocked: add relationship to company - action performed by ' + actor._id) + ' - message: ' + statusChangeAllowedResult.message;
        throw {
          code: 403,
          message: 'status update denied',
          detail: {
            reason: statusChangeAllowedResult.message
          }
        };
      } else {
        log('[RESPOND INVITE ACTION - ACCEPT] status change allowed = ' + JSON.stringify(statusChangeAllowedResult));
      }

      try{
        statusResponse = setStatus(actor._id, subject._id, companyId, companyLabel, AuthorisationStatus.CONFIRMED);
      } catch (e) {
        throw {
          code: 400,
          message: 'add relationship - status update failed - ' + e,
          detail: {
            reason: 'add relationship - status update failed - ' + e
          }
        };
      }

      log('[RESPOND INVITE ACTION - ACCEPT] add relationship success');

      return {
        success: statusResponse.success,
        caller: {
          id: actor._id,
          userName: actor.userName,
          fullName: actor.givenName
        },
        subject: {
          id: subject._id,
          userName: subject.userName,
          fullName: subject.givenName
        },
        company: {
          id: companyId,
          number: request.content.companyNumber,
          name: company.name,
          status: AuthorisationStatus.CONFIRMED,
          previousStatus: statusResponse.oldStatus,
          inviterId: subjectInviterId
        }
      };

    } else {
      log('[RESPOND INVITE ACTION - DECLINE] Request to delete PENDING company membership (decline invite)');
      statusChangeAllowedResult = allowInviteDecline(callerStatus, subjectStatus, isCallerAdminUser, isMe);
      if (!statusChangeAllowedResult.allowed) {
        log('[RESPOND INVITE ACTION - DECLINE] Action blocked: remove PENDING relationship to company - action performed by ' + actor._id) + ' - message: ' + statusChangeAllowedResult.message;
        throw {
          code: 403,
          message: 'relationship deletion denied',
          detail: {
            reason: statusChangeAllowedResult.message
          }
        };
      } else {
        log('[RESPOND INVITE ACTION - DECLINE] status change allowed = ' + JSON.stringify(statusChangeAllowedResult));
      }

      deleteRelationshipResult = deleteRelationship(subject._id, companyId);
      if (!deleteRelationshipResult || !deleteRelationshipResult.success) {
        log('[RESPOND INVITE ACTION - DECLINE] An error occurred while deleting the pending relationship (performed by user ' + actor._id + '): ' + deleteRelationshipResult.message);
        throw {
          code: 400,
          message: 'An error occurred while deleting the pending relationship',
          detail: {
            reason: deleteRelationshipResult.message
          }
        };
      }

      log('[RESPOND INVITE ACTION - DECLINE] remove pending relationship success');

      return {
        success: deleteRelationshipResult.success,
        caller: {
          id: actor._id,
          userName: actor.userName,
          fullName: actor.givenName
        },
        subject: {
          id: subject._id,
          userName: subject.userName,
          fullName: subject.givenName
        },
        company: {
          id: companyId,
          number: request.content.companyNumber,
          name: company.name,
          status: AuthorisationStatus.NONE,
          previousStatus: subjectStatus,
          inviterId: subjectInviterId
        }
      };
    }
  } else if (request.action === RequestAction.REMOVE_AUTHORISED_USER) {
    log('[REMOVE AUTHZ USER ACTION] Request to remove an authorised user from a company');

    if (!request.content.subjectId || !request.content.companyNumber) {
      log('[REMOVE AUTHZ USER ACTION] Invalid parameters - Expected: subjectId, companyNumber');
      throw {
        code: 400,
        message: 'Invalid Parameters - Expected: subjectId, companyNumber'
      };
    }

    // Authorisation check
    subjectStatus = getStatus(subject._id, companyId).status;
    var subjectInviterId = getStatus(subject._id, companyId).inviterId;
    callerStatus = getStatus(actor._id, companyId).status;
    newStatus = AuthorisationStatus.CONFIRMED;

    statusChangeAllowedResult = allowUserRemoval(callerStatus, actor._id, subjectStatus, subjectInviterId, isCallerAdminUser, isMe);
    if (!statusChangeAllowedResult.allowed) {
      log('[REMOVE AUTHZ USER ACTION] Action blocked: add user  to company - action performed by ' + actor._id) + ' - message: ' + statusChangeAllowedResult.message;
      throw {
        code: 403,
        message: 'user removal denied',
        detail: {
          reason: statusChangeAllowedResult.message
        }
      };
    } else {
      log('[REMOVE AUTHZ USER ACTION] status change allowed = ' + JSON.stringify(statusChangeAllowedResult));
    }

    var deleteRelationshipResult = deleteRelationship(subject._id, companyId);
    if (!deleteRelationshipResult || !deleteRelationshipResult.success) {
      log('[REMOVE AUTHZ USER ACTION] An error occurred while deleting the relationship (performed by user ' + actor._id + '): ' + deleteRelationshipResult.message);
      throw {
        code: 400,
        message: 'An error occurred while deleting the relationship',
        detail: {
          reason: deleteRelationshipResult.message
        }
      };
    }

    log('[REMOVE AUTHZ USER ACTION] remove relationship success');

    return {
      success: deleteRelationshipResult.success,
      caller: {
        id: actor._id,
        userName: actor.userName,
        fullName: actor.givenName
      },
      subject: {
        id: subject._id,
        userName: subject.userName,
        fullName: subject.givenName
      },
      company: {
        id: companyId,
        number: request.content.companyNumber,
        name: company.name,
        status: AuthorisationStatus.NONE,
        previousStatus: AuthorisationStatus.CONFIRMED
      }
    };
  } else if (request.action === RequestAction.ADD_AUTHORISED_USER) {
    log('[ADD AUTHZ USER ACTION] Request to add an authorised to a company');

    if (!request.content.subjectId || !request.content.companyNumber) {
      log('[ADD AUTHZ USER ACTION] Invalid parameters - Expected: subjectId, companyNumber');
      throw {
        code: 400,
        detail: {
          reason: 'Invalid Parameters - Expected: subjectId, companyNumber'
        }
      };
    }

    //log('Adding Authorised User - calling allowUserAdd');

    var statusChangeAllowedResult = allowUserAdd(callerStatus, subjectStatus, isCallerAdminUser);

    if (!statusChangeAllowedResult.allowed) {
      log('[ADD AUTHZ USER ACTION] Action blocked: add user  to company - action performed by ' + actor._id) + ' - message: ' + statusChangeAllowedResult.message;
      throw {
        code: 403,
        message: 'Action blocked: add user  to company - action performed by ' + actor._id,
        detail: {
          reason: statusChangeAllowedResult.message
        }
      };
    } else {
      log('[ADD AUTHZ USER ACTION] status change allowed = ' + JSON.stringify(statusChangeAllowedResult));
    }

    //log('[ADD AUTHZ USER ACTION] starting ...');

    var addRelationshipResult = addConfirmedRelationshipToCompany(subject._id, companyId, companyLabel);

//    log('[ADD AUTHZ USER ACTION] Add relationship result: ' + JSON.stringify(addRelationshipResult));

    if (!addRelationshipResult || !addRelationshipResult.success) {
      log('[ADD AUTHZ USER ACTION] An error occurred while adding the relationship: ' + JSON.stringify(addRelationshipResult));
      throw {
        code: 400,
        message: 'An error occurred while adding the relationship',
        detail: {
          reason: addRelationshipResult.message
        }
      };
    }

    log('[ADD AUTHZ USER ACTION] Add relationship success');

    var ret = {
      success: addRelationshipResult.success,
      caller: {
        id: actor._id,
        userName: actor.userName,
        fullName: actor.givenName
      },
      subject: {
        id: subject._id,
        userName: subject.userName,
        fullName: subject.givenName
      },
      company: {
        id: companyId,
        number: request.content.companyNumber,
        name: company.name,
        status: AuthorisationStatus.CONFIRMED,
        previousStatus: subjectStatus
      }
    };

    return ret;
  } else {
    log('Unknown action: ' + request.action);
    throw {
      code: 400,
      message: 'Unknown action: ' + request.action
    };
  }
})();
