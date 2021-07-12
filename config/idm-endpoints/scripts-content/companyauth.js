(function () {

    // Configuration

    var OBJECT_USER = "alpha_user";
    var OBJECT_COMPANY = "alpha_organization";
    var USER_RELATIONSHIP = "memberOfOrg";
    var COMPANY_RELATIONSHIP = "members";
    // var INTERNAL_ROLE_MEMBERSHIP_ADMIN = "internal/role/ch-membership-admin";
    var INTERNAL_IDM_ADMIN = "internal/role/openidm-admin";

    // Values for the memberOfOrg/members relationship property "status"

    var AuthorisationStatus = {
        CONFIRMED: "confirmed",
        PENDING: "pending",
        NONE: "none"
    };

    var InviteActions = {
        ACCEPT: "accept",
        DECLINE: "decline"
    };

    // Endpoint actions

    var RequestAction = {
        GET_STATUS_BY_USERNAME: "getCompanyStatusByUsername",
        GET_STATUS_BY_USERID: "getCompanyStatusByUserId",
        INVITE_USER_BY_USERNAME: "inviteUserByUsername",
        INVITE_USER_BY_USERID: "inviteUserByUserId",
        GET_COMPANY: "getCompanyByNumber",
        RESPOND_INVITE: "respondToInvite",
        REMOVE_AUTHORISED_USER: "removeAuthorisedUser",
        ADD_AUTHORISED_USER: "addAuthorisedUser"
        // GET_COMPANIES: "getCompanies",
        // GET_USER: "getUser",
        // GET_COMPANY: "getCompany"
    };

    // Debug loggers

    function log(message) {
        logger.error("AUTHEND " + message);
    }

    function logResponse(response) {
        log("Got response " + response);
    }

    // Fetch current status for user vs. company
    function getStatus(userId, companyId) {

        var status = AuthorisationStatus.NONE;
        var membership = null;
        var inviterId = null;
        var inviteTimestamp = null;
        var relationshipEntry;

        var response = openidm.query("managed/" + OBJECT_USER + "/" + userId + "/" + USER_RELATIONSHIP,
            { "_queryFilter": "true" },
            ["_refProperties/membershipStatus"]);

        logResponse("IDM User membershipStatus found: " + response);

        if (response.resultCount === 0) {
            log("No companies currently authorised");
        }
        else {
            response.result.forEach(function (entry) {
                // log("Got company " + entry._refResourceId);
                if (entry._refResourceId === companyId) {
                    status = entry._refProperties.membershipStatus;
                    inviterId = entry._refProperties.inviterId;
                    inviteTimestamp = entry._refProperties.inviteTimestamp;
                    log("Got a match for company " + companyId + ": membership status: " + status);
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
    function deleteRelationship(subjectId, companyId) {
        var currentStatusResponse = getStatus(subjectId, companyId);

        log("Deleting relationship for company " + companyId);
        log("patching: " + "managed/" + OBJECT_USER + "/" + subjectId);

        var payload = [
            {
                operation: "remove",
                field: "/memberOfOrg",
                value: {
                    _ref: currentStatusResponse.entry._ref,
                    _refResourceCollection: currentStatusResponse.entry._refResourceCollection,
                    _refResourceId: currentStatusResponse.entry._refResourceId,
                    _refProperties: currentStatusResponse.entry._refProperties
                }
            }
        ];

        var newObject = openidm.patch("managed/" + OBJECT_USER + "/" + subjectId,
            null,
            payload);

        // check that the relationship has been removed from the user
        if (JSON.stringify(newObject.memberOfOrgIDs).indexOf(currentStatusResponse.entry._refResourceId) > -1) {
            return {
                success: false,
                message: "The relationship with company " + companyId + " could not be removed from the user"
            };
        } else {
            log("Relationship removed");
        }

        return {
            success: true
        };
    }

    // adds a CONFIRMED relationship between the provided user and company, and replaces it if there's one in PENDING status already
    function addConfirmedRelationshipToCompany(subjectId, companyId) {

        var currentStatusResponse = getStatus(subjectId, companyId);

        //if the user has a pending relationship with the company, remove it
        if (currentStatusResponse.status === AuthorisationStatus.PENDING) {
            log("The user has already a PENDING relationship with the company ");
            var deleteResponse = deleteRelationship(subjectId, companyId);
            if (!deleteResponse.success) {
                return {
                    success: false
                }
            }
        }

        var payload = [
            {
                operation: "add",
                field: "/memberOfOrg/-",
                value: {
                    _ref: "managed/alpha_organization/" + companyId,
                    _refProperties: {
                        membershipStatus: AuthorisationStatus.CONFIRMED,
                        inviterId: null,
                        inviteTimestamp: null
                    }
                }
            }
        ];

        var newObject = openidm.patch("managed/" + OBJECT_USER + "/" + subjectId,
            null,
            payload);

        if (JSON.stringify(newObject.memberOfOrgIDs).indexOf(companyId) > -1) {
            return {
                success: true
            };
        }

        return {
            success: false,
            message: "The relationship with company " + companyId + " could not be added to the user"
        }
    }

    // Update status for user vs. company
    function setStatus(callerId, subjectId, companyId, newStatus) {

        var currentStatusResponse = getStatus(subjectId, companyId);
        if (currentStatusResponse.status === AuthorisationStatus.NONE) {
            log("Creating new relationship for company " + companyId + " with status " + newStatus);
            openidm.create("managed/" + OBJECT_USER + "/" + subjectId + "/" + USER_RELATIONSHIP,
                null,
                {
                    "_ref": "managed/" + OBJECT_COMPANY + "/" + companyId,
                    "_refProperties": {
                        "membershipStatus": newStatus,
                        "inviterId": callerId,
                        "inviteTimestamp": new Date().toString()
                    }
                });
        }
        else if (currentStatusResponse.status === newStatus) {
            log("Status already " + newStatus);
        } else {
            log("Updating status from " + currentStatusResponse.status + " to " + newStatus + " for company " + companyId);

            var statusUpdate = {
                operation: "replace",
                field: "/_refProperties/membershipStatus",
                value: newStatus
            };

            var inviterUpdate = {
                operation: "replace",
                field: "/_refProperties/inviterId",
                value: callerId
            };

            var inviteTimestampUpdate = {
                operation: "replace",
                field: "/_refProperties/inviteTimestamp",
                value: new Date().toString()
            };

            // update the 'inviterId' and 'inviteTimestamp' relationship property only when an invitation is created, do not override them when invite is accepted
            var newobject = openidm.patch("managed/" + OBJECT_USER + "/" + subjectId + "/" + USER_RELATIONSHIP + "/" + currentStatusResponse.membership,
                null,
                (newStatus === AuthorisationStatus.CONFIRMED) ? [statusUpdate] : [statusUpdate, inviterUpdate, inviteTimestampUpdate]);
        };

        return {
            success: true,
            oldStatus: currentStatusResponse.status
        };
    }

    // Look up a uid from a username
    function getUserByUsername(username) {
        // log("Looking up user " + username);
        var response = openidm.query("managed/" + OBJECT_USER,
            { "_queryFilter": "/userName eq \"" + username + "\"" },
            ["_id", "userName", "givenName", "roles", "authzRoles", "memberOfOrg", "memberOfOrgIDs"]);

        if (response.resultCount !== 1) {
            log("getUserByUsername: Bad result count: " + response.resultCount);
            return null;
        }

        return response.result[0];
    }

    // Look up a uid from a username
    function getUserById(userId) {
        // log("Looking up user " + userId);
        var response = openidm.query("managed/" + OBJECT_USER,
            { "_queryFilter": "/_id eq \"" + userId + "\"" },
            ["_id", "userName", "givenName", "roles", "authzRoles", "memberOfOrg", "memberOfOrgIDs"]);

        if (response.resultCount !== 1) {
            log("getUserById: Bad result count: " + response.resultCount);
            return null;
        }

        return response.result[0];
    }

    // Look up a company from a company number
    function getCompany(number) {
        // log("Looking up  company " + number);
        var response = openidm.query("managed/" + OBJECT_COMPANY,
            { "_queryFilter": "/number eq \"" + number + "\"" },
            ["_id", "number", "name", "authCode", "status", "members"]);

        if (response.resultCount === 0) {
            log("getCompany: Bad result count: " + response.resultCount);
            return null;
        }

        return response.result[0];
    }

    // Authorisation logic to allow a user (caller) to accept an invitation to become authorised for a Company
    function allowInviteAcceptance(callerStatus, subjectStatus, newStatus, isCallerAdminUser, isMe) {
        log("ACCEPT INVITE AUTHZ CHECK: callerStatus " + callerStatus + ", subjectStatus " + subjectStatus + ", newStatus " + newStatus + ", isAdminUser " + isCallerAdminUser + ", isMe " + isMe);

        if (subjectStatus === AuthorisationStatus.NONE) {
            return {
                message: "The subject does not have a relationship with the company.",
                allowed: false
            };
        }

        if (isCallerAdminUser &&
            subjectStatus === AuthorisationStatus.PENDING &&
            newStatus === AuthorisationStatus.CONFIRMED) {
            log("Caller is admin - changing from '" + subjectStatus + "' to '" + newStatus + "' allowed");
            return {
                allowed: true
            };
        }

        // if caller is also subject, and the current status is PENDING and the target is CONFIRMED
        if (isMe &&
            subjectStatus === AuthorisationStatus.PENDING &&
            newStatus === AuthorisationStatus.CONFIRMED) {
            log("Caller is also subject - changing from '" + subjectStatus + "' to '" + newStatus + "' allowed");
            return {
                allowed: true
            };
        }

        // if caller is authorised, allow subject transition from NONE to PENDING
        if (callerStatus === AuthorisationStatus.CONFIRMED &&
            subjectStatus === AuthorisationStatus.PENDING &&
            newStatus === AuthorisationStatus.CONFIRMED) {
            log("Caller is already authorised - changing subject relationship from PENDING to CONFIRMED: status change allowed");
            return {
                allowed: true
            };
        }

        // if caller is authorised, deny subject transition from PENDING to PENDING
        if (callerStatus === AuthorisationStatus.CONFIRMED &&
            subjectStatus === AuthorisationStatus.CONFIRMED &&
            newStatus === AuthorisationStatus.CONFIRMED) {
            log("Caller is already authorised - subject status for company is already CONFIRMED - Status change allowed");
            return {
                allowed: true
            };
        }

        // for any other combination, deny the request
        return {
            message: "Caller is not authorised for the company, is not an admin or is not the subject.",
            allowed: false
        };
    }

    // Authorisation logic to allow a user (caller) to remove an authorised/invited from a Company
    function allowUserRemoval(callerStatus, callerId, subjectStatus, subjectInviterId, isCallerAdminUser, isMe) {
        log("REMOVE USER AUTHZ CHECK: callerStatus " + callerStatus + ", subjectStatus " + subjectStatus + ", isAdminUser " + isCallerAdminUser + ", isMe " + isMe);

        // if the caller is an admin and the subject is CONFIRMED, allow the removal
        if (isCallerAdminUser) {
            log("Caller is admin - changing from '" + subjectStatus + "' to 'NONE' allowed");
            return {
                allowed: true
            };
        }

        // the user we are trying to remove from a company does not actually have a relationship with the company
        if (subjectStatus === AuthorisationStatus.NONE) {
            return {
                message: "The subject does not have a relationship with the company - removal not possible.",
                allowed: false
            };
        }

        // if the caller is a company authorised user and and the subject is also authorised, allow the removal
        if (callerStatus === AuthorisationStatus.CONFIRMED && subjectStatus === AuthorisationStatus.CONFIRMED) {
            log("Caller is authorised for the company, and subject too - changing from 'CONFIRMED' to 'NONE' allowed");
            return {
                allowed: true
            };
        }

        // if caller is authroised for company AND the creator of the subject invite, and the current subject status is PENDING, allow the removal
        if (subjectStatus === AuthorisationStatus.PENDING &&
            callerStatus === AuthorisationStatus.CONFIRMED &&
            callerId === subjectInviterId) {
            log("Caller is creator of the subject invite - changing from 'PENDING' to 'NONE' allowed");
            return {
                allowed: true
            };
        }

        // for any other combination, deny the request
        return {
            message: "Possible failure reasons: Caller is not authorised for the company, subject is invited and caller is not the inviter, caller is not an admin user.",
            allowed: false
        };
    }

    // Authorisation logic to allow a user (caller) to add an authorised/invited to a Company: only possible if the user has an auth code
    function allowUserAdd(callerStatus, subjectStatus, isCallerAdminUser) {
        log("ADD USER AUTHZ CHECK: callerStatus " + callerStatus + ", subjectStatus " + subjectStatus + ", isAdminUser " + isCallerAdminUser);

        // if the caller is an admin and the subject is CONFIRMED, allow the removal
        if (isCallerAdminUser) {
            log("Caller is admin - changing from '" + subjectStatus + "' to 'CONFIRMED' allowed");
            return {
                allowed: true
            };
        }

        // for any other combination, deny the request
        return {
            message: "Possible failure reasons: Caller is not an admin user.",
            allowed: false
        };
    }

    // Authorisation logic to allow a user (caller) to decline an invitation to become authorised for a Company
    function allowInviteDecline(callerStatus, subjectStatus, isCallerAdminUser, isMe) {
        log("DECLINE INVITE AUTHZ CHECK: callerStatus " + callerStatus + ", subjectStatus " + subjectStatus + ", isAdminUser " + isCallerAdminUser + ", isMe " + isMe);

        if (subjectStatus === AuthorisationStatus.NONE) {
            return {
                message: "The subject does not have a relationship with the company.",
                allowed: false
            };
        }

        if (isCallerAdminUser &&
            subjectStatus === AuthorisationStatus.PENDING) {
            log("Caller is admin - deleting relationship in status '" + subjectStatus + "' allowed");
            return {
                allowed: true
            };
        }

        // if caller is also subject, and the current status is PENDING and the target is CONFIRMED
        if (isMe &&
            subjectStatus === AuthorisationStatus.PENDING) {
            log("Caller is also subject - deleting relationship in status '" + subjectStatus + "' allowed");
            return {
                allowed: true
            };
        }

        // if caller is authorised, allow subject transition from NONE to PENDING
        if (callerStatus === AuthorisationStatus.CONFIRMED &&
            subjectStatus === AuthorisationStatus.PENDING) {
            log("Caller is already authorised - deleting relationship in status PENDING allowed");
            return {
                allowed: true
            };
        }

        // for any other combination, deny the request
        return {
            message: "Caller is not authorised for the company, is not an admin or is not the subject.",
            allowed: false
        };
    }

    // Authorisation logic to allow a user (caller) to send an invite to another user (subject) to become authorised for a Company
    function allowInviteSending(callerStatus, subjectStatus, newStatus, isCallerAdminUser, isMe) {

        log("INVITE AUTHZ CHECK: callerStatus " + callerStatus + " subjectStatus " + subjectStatus + " newStatus " + newStatus + " isAdminUser " + isCallerAdminUser + " isMe " + isMe);

        // if the caller is an admin, allow to invite any user to any company
        if (isCallerAdminUser) {
            log("Caller is admin - changing from '" + subjectStatus + "' to '" + newStatus + "' allowed");
            return {
                allowed: true
            };
        }

        // if caller is authorised, allow subject transition from NONE to PENDING
        if (callerStatus === AuthorisationStatus.CONFIRMED &&
            subjectStatus === AuthorisationStatus.NONE &&
            newStatus === AuthorisationStatus.PENDING) {
            log("Caller is already authorised - changing subject relationship from NONE to PENDING: status change allowed");
            return {
                allowed: true
            };
        }

        // if caller is authorised, allow subject transition from PENDING to PENDING
        if (callerStatus === AuthorisationStatus.CONFIRMED &&
            subjectStatus === AuthorisationStatus.PENDING &&
            newStatus === AuthorisationStatus.PENDING) {
            log("Caller is already authorised - subject status for company is already PENDING - Status change allowed");
            return {
                allowed: true
            };
        }

        // if caller is authorised, deny subject transition from NONE to PENDING
        if (callerStatus === AuthorisationStatus.CONFIRMED &&
            subjectStatus === AuthorisationStatus.CONFIRMED &&
            newStatus === AuthorisationStatus.PENDING) {
            log("Caller is already authorised - subject status for company is already CONFIRMED, cannot set it to PENDING");
            return {
                allowed: false,
                message: "subject status for company is already CONFIRMED, cannot set it to PENDING"
            };
        }

        // for any other combination, deny the request
        return {
            message: "Caller is not authorised for the company, is not an admin, or the state transition is not allowed",
            allowed: false
        };

    }

    // ************************************
    // ************ Entrypoint ************
    // ************************************

    log("Incoming request: " + request.content);

    var actor;
    var subject;
    var isMe = false;
    if (request.content.callerId) {
        actor = getUserById(request.content.callerId);
    } else {
        actor = getUserById(context.security.authenticationId);
    }
    log("Caller Id: " + actor._id + "(username: " + actor.userName + ")");

    var isCallerAdminUser = JSON.stringify(actor.authzRoles).indexOf(INTERNAL_IDM_ADMIN) !== -1;
    log("Is Caller an Admin (openidm-admin role): " + isCallerAdminUser);

    if (!request.action) {
        log("No action");
        throw {
            code: 400,
            message: "Bad request - no _action parameter"
        };
    }

    var company = getCompany(request.content.companyNumber);
    if (!company) {
        log("Company could not be found: " + request.content.companyNumber);
        throw {
            code: 404,
            message: "Company could not be found: " + request.content.companyNumber
        };
    }

    var companyId = company._id;
    log("Company found: " + companyId);

    //do not lookup subject for the GET_COMPANY user
    if (request.action !== RequestAction.GET_COMPANY) {
        if (request.content.subjectId) {
            subject = getUserById(request.content.subjectId);
        } else if (request.content.subjectUserName) {
            subject = getUserByUsername(request.content.subjectUserName);
        }

        if (!subject) {
            log("User could not be found: " + (request.content.subjectUserName ? request.content.subjectUserName : request.content.subjectId));
            throw {
                code: 404,
                message: "User could not be found: " + (request.content.subjectUserName ? request.content.subjectUserName : request.content.subjectId)
            };
        }

        log("User found: " + subject);
    }

    if (subject && actor) {
        isMe = (subject._id === actor._id);
    }

    // GET MEMBERSHIP STATUS BY USERNAME AND COMPANY NUMBER
    if (request.action === RequestAction.GET_STATUS_BY_USERNAME) {

        log("Request to read subject company membership status by userName");

        log("Caller Id: " + actor._id + "(subjectUserName: " + actor.userName + ")");

        if (!request.content.subjectUserName || !request.content.companyNumber) {
            log("Invalid parameters - Expected: subjectUserName, companyNumber");
            throw {
                code: 400,
                message: "Invalid Parameters - Expected: subjectUserName, companyNumber"
            };
        }

        var statusResponse = getStatus(subject._id, companyId);
        log("Membership status: " + JSON.stringify(statusResponse));

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
                status: statusResponse.status,
                inviterId: statusResponse.inviterId,
                inviteTimestamp: statusResponse.inviteTimestamp
            }
        };

    }
    // GET MEMBERSHIP STATUS BY USERID AND COMPANY NUMBER
    else if (request.action === RequestAction.GET_STATUS_BY_USERID) {

        log("Request to read subject company membership status by userId");

        if (!request.content.subjectId || !request.content.companyNumber) {
            log("Invalid parameters - Expected: subjectId, companyNumber");
            throw {
                code: 400,
                message: "Invalid Parameters - Expected: subjectId, companyNumber"
            };
        }

        var statusResponse = getStatus(subject._id, companyId);
        log("Membership status: " + JSON.stringify(statusResponse));

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
                status: statusResponse.status,
                inviterId: statusResponse.inviterId,
                inviteTimestamp: statusResponse.inviteTimestamp
            }
        };
    }
    // SET MEMBERSHIP STATUS
    else if (request.action === RequestAction.INVITE_USER_BY_USERID) {

        log("Request to set membership status request to PENDING (send invitation) by userId");

        if (!request.content.subjectId || !request.content.companyNumber) {
            log("Invalid parameters - Expected: subjectId, companyNumber");
            throw {
                code: 400,
                message: "Invalid Parameters - Expected: subjectId, companyNumber"
            };
        }

        // Authorisation check
        var subjectStatus = getStatus(subject._id, companyId).status;
        var callerStatus = (isMe) ? subjectStatus : getStatus(actor._id, companyId).status;
        var newStatus = AuthorisationStatus.PENDING;

        var statusChangeAllowedResult = allowInviteSending(callerStatus, subjectStatus, newStatus, isCallerAdminUser, isMe);
        if (!statusChangeAllowedResult.allowed) {
            log("Blocked status update by user " + actor._id);
            throw {
                code: 403,
                message: "status update denied",
                detail: {
                    reason: statusChangeAllowedResult.message
                }
            };
        }

        var statusResponse;
        try {
            statusResponse = setStatus(actor._id, subject._id, companyId, AuthorisationStatus.PENDING);
        } catch (e) {
            throw {
                code: 400,
                message: "status update denied",
                detail: {
                    reason: statusResponse.message
                }
            };
        }

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
                status: AuthorisationStatus.PENDING,
                previousStatus: statusResponse.oldStatus
            }
        };

    }
    else if (request.action === RequestAction.INVITE_USER_BY_USERNAME) {

        log("Request to set membership status to PENDING (send invitation) by subject userName");

        if (!request.content.subjectUserName || !request.content.companyNumber) {
            log("Invalid parameters - Expected: subjectUserName, companyNumber");
            throw {
                code: 400,
                message: "Invalid Parameters - Expected: subjectUserName, companyNumber"
            };
        }

        // Authorisation check
        var subjectStatus = getStatus(subject._id, companyId).status;
        var callerStatus = getStatus(actor._id, companyId).status;
        var newStatus = AuthorisationStatus.PENDING;

        var statusChangeAllowedResult = allowInviteSending(callerStatus, subjectStatus, newStatus, isCallerAdminUser, isMe);
        if (!statusChangeAllowedResult.allowed) {
            log("Blocked status update by user " + actor._id);
            throw {
                code: 403,
                message: "status update denied",
                detail: {
                    reason: statusChangeAllowedResult.message
                }
            };
        }

        var statusResponse;
        try {
            statusResponse = setStatus(actor._id, subject._id, companyId, AuthorisationStatus.PENDING);
        } catch (e) {
            throw {
                code: 400,
                message: "status update denied",
                detail: {
                    reason: statusResponse.message
                }
            };
        }

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
                status: AuthorisationStatus.PENDING,
                previousStatus: statusResponse.oldStatus
            }
        };

    }
    else if (request.action === RequestAction.GET_COMPANY) {

        log("Request to get company data");

        if (!request.content.companyNumber) {
            log("Invalid parameters - Expected: companyNumber");
            throw {
                code: 400,
                message: "Invalid Parameters - Expected: companyNumber"
            };
        }

        if (company.authCode == null) {
            return {
                success: false,
                message: "No auth code associated with company " + request.content.companyNumber
            };
        }

        if (company.status !== "active") {
            return {
                success: false,
                message: "The company " + request.content.companyNumber + " is not active."
            };
        }

        return {
            success: true,
            caller: {
                id: actor._id,
                userName: actor.userName,
                fullName: actor.givenName
            },
            company: company
        };
    }
    else if (request.action === RequestAction.RESPOND_INVITE) {

        log("Request to respond to an invite (accept/decline)");

        if (!request.content.subjectId || !request.content.companyNumber || !request.content.action) {
            log("Invalid parameters - Expected: subjectId, companyNumber, action");
            throw {
                code: 400,
                message: "Invalid Parameters - Expected: subjectId, companyNumber, action"
            };
        }

        if (request.content.action !== InviteActions.ACCEPT && request.content.action !== InviteActions.DECLINE) {
            log("Invalid parameters - The actions allowed on an invitation can only be 'accept' or 'decline'");
            throw {
                code: 400,
                message: "Invalid Parameters - The actions allowed on an invitation can only be 'accept' or 'decline'"
            };
        }

        // Authorisation check
        var subjectStatus = getStatus(subject._id, companyId).status;
        var callerStatus = getStatus(actor._id, companyId).status;

        if (request.content.action === InviteActions.ACCEPT) {
            var newStatus = AuthorisationStatus.CONFIRMED;

            log("Request to set membership status to CONFIRMED (accept invite)");
            var statusChangeAllowedResult = allowInviteAcceptance(callerStatus, subjectStatus, newStatus, isCallerAdminUser, isMe);
            if (!statusChangeAllowedResult.allowed) {
                log("Blocked status update by user " + actor._id);
                throw {
                    code: 403,
                    message: "status update denied",
                    detail: {
                        reason: statusChangeAllowedResult.message
                    }
                };
            }

            var statusResponse = setStatus(actor._id, subject._id, companyId, AuthorisationStatus.CONFIRMED);
            if (!statusResponse || !statusResponse.success) {
                throw {
                    code: 400,
                    message: "An error occurred while accepting/declining the invite",
                    detail: {
                        reason: statusChangeAllowedResult.message
                    }
                };
            }

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
                    status: AuthorisationStatus.CONFIRMED,
                    previousStatus: statusResponse.oldStatus
                }
            };

        } else {
            log("Request to delete PENDING company membership (decline invite)");
            var statusChangeAllowedResult = allowInviteDecline(callerStatus, subjectStatus, isCallerAdminUser, isMe);
            if (!statusChangeAllowedResult.allowed) {
                log("Blocked status update by user " + actor._id);
                throw {
                    code: 403,
                    message: "relationship deletion denied",
                    detail: {
                        reason: statusChangeAllowedResult.message
                    }
                };
            }

            var deleteRelationshipResult = deleteRelationship(subject._id, companyId);
            if (!deleteRelationshipResult || !deleteRelationshipResult.success) {
                throw {
                    code: 400,
                    message: "An error occurred while deleting the relationship",
                    detail: {
                        reason: deleteRelationshipResult.message
                    }
                };
            }

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
                    status: AuthorisationStatus.NONE,
                    previousStatus: subjectStatus
                }
            }
        }
    }
    else if (request.action === RequestAction.REMOVE_AUTHORISED_USER) {
        log("Request to remove an authorised user from a company");

        if (!request.content.subjectId || !request.content.companyNumber) {
            log("Invalid parameters - Expected: subjectId, companyNumber");
            throw {
                code: 400,
                message: "Invalid Parameters - Expected: subjectId, companyNumber"
            };
        }

        // Authorisation check
        var subjectStatus = getStatus(subject._id, companyId).status;
        var subjectInviterId = getStatus(subject._id, companyId).inviterId;
        var callerStatus = getStatus(actor._id, companyId).status;
        var newStatus = AuthorisationStatus.CONFIRMED;

        var statusChangeAllowedResult = allowUserRemoval(callerStatus, actor._id, subjectStatus, subjectInviterId, isCallerAdminUser, isMe);
        if (!statusChangeAllowedResult.allowed) {
            log("Blocked user removal performed by user " + actor._id);
            throw {
                code: 403,
                message: "user removal denied",
                detail: {
                    reason: statusChangeAllowedResult.message
                }
            };
        }

        var deleteRelationshipResult = deleteRelationship(subject._id, companyId);
        if (!deleteRelationshipResult || !deleteRelationshipResult.success) {
            throw {
                code: 400,
                message: "An error occurred while deleting the relationship",
                detail: {
                    reason: deleteRelationshipResult.message
                }
            };
        }

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
                status: AuthorisationStatus.NONE,
                previousStatus: AuthorisationStatus.CONFIRMED
            }
        };
    } else if (request.action === RequestAction.ADD_AUTHORISED_USER) {
        log("Request to add an authorised to a company");

        if (!request.content.subjectId || !request.content.companyNumber) {
            log("Invalid parameters - Expected: subjectId, companyNumber");
            throw {
                code: 400,
                message: "Invalid Parameters - Expected: subjectId, companyNumber"
            };
        }

        var statusChangeAllowedResult = allowUserAdd(callerStatus, subjectStatus, isCallerAdminUser);
        if (!statusChangeAllowedResult.allowed) {
            log("Blocked user adding performed by user " + actor._id);
            throw {
                code: 403,
                message: "user add denied",
                detail: {
                    reason: statusChangeAllowedResult.message
                }
            };
        }

        var addRelationshipResult = addConfirmedRelationshipToCompany(subject._id, companyId);
        if (!addRelationshipResult || !addRelationshipResult.success) {
            throw {
                code: 400,
                message: "An error occurred while adding the relationship",
                detail: {
                    reason: addRelationshipResult.message
                }
            };
        }

        return {
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
                status: AuthorisationStatus.CONFIRMED,
                previousStatus: subjectStatus 
            }
        };

    }
    else {
        throw {
            code: 400,
            message: "Unknown action: " + request.action
        };
    }
})();
