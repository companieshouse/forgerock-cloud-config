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

    // Endpoint actions

    var RequestAction = {
        GET_STATUS_BY_USERNAME: "getCompanyStatusByUsername",
        GET_STATUS_BY_USERID: "getCompanyStatusByUserId",
        INVITE_USER_BY_USERNAME: "inviteUserByUsername",
        INVITE_USER_BY_USERID: "inviteUserByUserId",
        GET_COMPANY: "getCompanyByNumber",
        ACCEPT_INVITE: "acceptInvite",
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

    function getStatus(user, companyId) {

        var status = AuthorisationStatus.NONE;
        var membership = null;

        var response = openidm.query("managed/" + OBJECT_USER + "/" + user + "/" + USER_RELATIONSHIP,
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
                    log("Got a match for company " + companyId + ": membership status: " + status);
                    membership = entry._id;
                }
            });
        }

        return { status: status, membership: membership };

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
                        "inviterId": callerId
                    }
                });
        }
        else if (currentStatusResponse.status === newStatus) {
            log("Status already " + newStatus);
        }
        else {
            log("Updating status from " + currentStatusResponse.status + " to " + newStatus + " for company " + companyId);
            var newobject = openidm.patch("managed/" + OBJECT_USER + "/" + subjectId + "/" + USER_RELATIONSHIP + "/" + currentStatusResponse.membership,
                null,
                [{
                    operation: "replace",
                    field: "/_refProperties/membershipStatus",
                    value: newStatus
                },
                {
                    operation: "replace",
                    field: "/_refProperties/inviterId",
                    value: callerId
                }]);
        }

        return {
            success: true,
            newobject: newobject,
            oldStatus: currentStatusResponse.status
        };
    }

    // Look up a uid from a username
    function getUserByUsername(username) {
        // log("Looking up user " + username);
        var response = openidm.query("managed/" + OBJECT_USER,
            { "_queryFilter": "/userName eq \"" + username + "\"" },
            ["_id", "userName", "givenName"]);

        if (response.resultCount !== 1) {
            log("Bad result count " + response.resultCount);
            return null;
        }

        return response.result[0];
    }

    // Look up a uid from a username
    function getUserById(userId) {
        // log("Looking up user " + userId);
        var response = openidm.query("managed/" + OBJECT_USER,
            { "_queryFilter": "/_id eq \"" + userId + "\"" },
            ["_id", "userName", "givenName", "roles", "authzRoles"]);

        if (response.resultCount !== 1) {
            log("Bad result count " + response.resultCount);
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
            log("Bad result count: " + response.resultCount);
            return null;
        }

        return response.result[0];
    }

    // Fetch all users who are associated with a given company
    // Optionally filter on status
    function getAuthorisedUsers(company, status) {
        var users = [];

        // Fetch all records and filter results (can't search on relationship property)

        var response = openidm.query("managed/" + OBJECT_COMPANY + "/" + company + "/" + COMPANY_RELATIONSHIP,
            { "_queryFilter": "true" },
            ["userName", "_refProperties/status"]);

        logResponse(response);

        if (response.resultCount === 0) {
            log("No users currently authorised");
        }
        else {
            response.result.forEach(function (entry) {
                var entryStatus = entry._refProperties.status;
                log("Got user " + entry._refResourceId + " status " + entryStatus);
                if (!status || entryStatus === status) {
                    users.push({
                        username: entry.userName,
                        uid: entry._refResourceId,
                        status: entryStatus
                    });
                }
            });
        }

        return users;
    }

    // Get all the companies with which a user is associated
    function getAuthorisedCompanies(subject) {
        var companies = [];


        var response = openidm.query("managed/" + OBJECT_USER + "/" + subject + "/" + USER_RELATIONSHIP,
            { "_queryFilter": "true" },
            ["name", "number", "_refProperties/status"]);

        logResponse(response);

        if (response.resultCount === 0) {
            log("No companies currently authorised");
        }
        else {
            response.result.forEach(function (entry) {
                log("Got company " + entry._refResourceId);
                companies.push({ number: entry.number, name: entry.name, uid: entry._refResourceId, status: entry._refProperties.status })
            });
        }

        return companies;
    }

    // Authorisation logic to allow a user (caller) to accept an invitation to a Company
    function allowInviteAcceptance(callerStatus, subjectStatus, newStatus, isCallerAdminUser, isMe) {
        log("ACCEPT INVITE AUTHZ CHECK: callerStatus " + callerStatus + " subjectStatus " + subjectStatus + " newStatus " + newStatus + " isAdminUser " + isCallerAdminUser + " isMe " + isMe);

        if (isCallerAdminUser &&
            subjectStatus === AuthorisationStatus.PENDING &&
            newStatus === AuthorisationStatus.CONFIRMED) {
            log("Caller is admin - changing from '" + subjectStatus + "' to '" + newStatus + "' allowed");
            return {
                allowed: true
            };
        }

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
            allowed: false
        };
    }

    // Authorisation logic to allow a user (caller) to invite another user (subject) to a Company
    function allowInvite(callerStatus, subjectStatus, newStatus, isCallerAdminUser, isMe) {

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

        // if caller is authorised, deny subject transition from PENDING to PENDING
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
            log("Caller is already authorised - subject status for company is already CONFIRMED, cannot set it to PENDING: status change denied");
            return {
                allowed: false,
                message: "subject status for company is already CONFIRMED, cannot set it to PENDING"
            };
        }

        // for any other combination, deny the request
        return {
            allowed: false
        };

    }

    // Entrypoint
    log("Incoming request: " + request.content);

    var actor;
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
        throw { code: 400, message: "Bad request - no _action parameter" };
    }

    // GET MEMBERSHIP STATUS BY USERNAME AND COMPANY NUMBER
    if (request.action === RequestAction.GET_STATUS_BY_USERNAME) {

        log("Request to read subject company membership status by userName");

        log("Caller Id: " + actor._id + "(username: " + actor.userName + ")");

        if (!request.content.userName || !request.content.companyNumber) {
            log("Invalid parameters - Expected: userName, companyNumber");
            throw { code: 400, message: "Invalid Parameters - Expected: userName, companyNumber" };
        }

        // Authorisation check - must be admin or getting own status
        var subject = getUserByUsername(request.content.userName);
        log("User found: " + subject._id);

        var isMe = (subject._id === actor._id);

        var companyId = getCompany(request.content.companyNumber)._id;
        log("Company found: " + companyId);

        var statusResponse = getStatus(subject._id, companyId);
        log("Membership status: " + JSON.stringify(statusResponse));

        return {
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
                status: statusResponse.status
            }
        };
    }
    // GET MEMBERSHIP STATUS BY USERID AND COMPANY NUMBER
    else if (request.action === RequestAction.GET_STATUS_BY_USERID) {

        log("Request to read subject company membership status by userId");

        if (!request.content.userId || !request.content.companyNumber) {
            log("Invalid parameters - Expected: userId, companyNumber");
            throw { code: 400, message: "Invalid Parameters - Expected: userId, companyNumber" };
        }

        // Authorisation check - must be admin or getting own status
        var subject = getUserById(request.content.userId);
        var isMe = (subject._id === actor._id);

        log("User found: " + subject._id);

        var companyId = getCompany(request.content.companyNumber)._id;
        log("Company found: " + companyId);

        var statusResponse = getStatus(subject._id, companyId);
        log("Membership status: " + JSON.stringify(statusResponse));

        return {
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
                status: statusResponse.status
            }
        };
    }
    // SET MEMBERSHIP STATUS
    else if (request.action === RequestAction.INVITE_USER_BY_USERID) {

        log("Request to aet membership status request to PENDING (send invitation) by userId");

        if (!request.content.subjectId || !request.content.companyNumber || !request.content.status) {
            log("Invalid parameters - Expected: subjectId, companyNumber, status");
            throw { code: 400, message: "Invalid Parameters - Expected: subjectId, companyNumber, status" };
        }

        if (request.content.status !== AuthorisationStatus.PENDING) {
            log("Invalid parameters - The status for an invitation request can only be 'pending'");
            throw { code: 400, message: "Invalid Parameters - The status for an invitation request can only be 'pending'" };
        }

        // Authorisation check
        var companyId = getCompany(request.content.companyNumber)._id;
        var subject = getUserById(request.content.subjectId);
        var isMe = (subject._id === actor._id);

        var subjectStatus = getStatus(subject._id, companyId).status;
        var callerStatus = (isMe) ? subjectStatus : getStatus(actor._id, companyId).status;
        var newStatus = request.content.status;

        var statusChangeResult = allowInvite(callerStatus, subjectStatus, newStatus, isCallerAdminUser, isMe);
        if (!statusChangeResult.allowed) {
            log("Blocked status update by user " + actor._id);
            throw { code: 403, message: "Status update denied: " + statusChangeResult.message };
        }

        var statusResponse = setStatus(actor._id, subject._id, companyId, request.content.status);

        return {
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
                status: request.content.status,
                previousStatus: statusResponse.oldStatus,
                success: statusResponse.success
            }
        };
    }
    else if (request.action === RequestAction.INVITE_USER_BY_USERNAME) {

        log("Request to set membership status to PENDING (send invitation) by subject userName");

        if (!request.content.subjectUserName || !request.content.companyNumber || !request.content.status) {
            log("Invalid parameters - Expected: subjectUserName, companyNumber, status");
            throw { code: 400, message: "Invalid Parameters - Expected: subjectUserName, companyNumber, status" };
        }

        if (request.content.status !== AuthorisationStatus.PENDING) {
            log("Invalid parameters - The status for an invitation request can only be 'pending' for invitation requests");
            throw { code: 400, message: "Invalid Parameters - The status for an invitation request can only be 'pending' for invitation requests" };
        }

        // Authorisation check
        var companyId = getCompany(request.content.companyNumber)._id;
        var subject = getUserByUsername(request.content.subjectUserName);
        var isMe = (subject._id === actor._id);

        var subjectStatus = getStatus(subject._id, companyId).status;
        var callerStatus = getStatus(actor._id, companyId).status;
        var newStatus = request.content.status;

        var statusChangeResult = allowInvite(callerStatus, subjectStatus, newStatus, isCallerAdminUser, isMe);
        if (!statusChangeResult.allowed) {
            log("Blocked status update by user " + actor._id);
            throw { code: 403, message: "status update denied: " + statusChangeResult.message };
        }

        var statusResponse = setStatus(actor._id, subject._id, companyId, request.content.status);

        return {
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
                status: request.content.status,
                previousStatus: statusResponse.oldStatus,
                success: statusResponse.success
            }
        };
    }
    else if (request.action === RequestAction.GET_COMPANY) {

        log("Request to get company data");

        if (!request.content.companyNumber) {
            log("Invalid parameters - Expected: companyNumber");
            throw { code: 400, message: "Invalid Parameters - Expected: companyNumber" };
        }

        var companyData = getCompany(request.content.companyNumber);
        if (!companyData) {
            return {
                success: false,
                message: "The company with number " + request.content.companyNumber + " could not be found."
            };
        }

        if (companyData.authCode == null) {
            return {
                success: false,
                message: "No auth code associated with company " + request.content.companyNumber
            };
        }

        if (companyData.status !== "active") {
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
            company: companyData
        };
    }
    else if (request.action === RequestAction.ACCEPT_INVITE) {

        log("Request to set membership status to CONFIRMED (accept invite)");

        if (!request.content.subjectId || !request.content.companyNumber || !request.content.status) {
            log("Invalid parameters - Expected: subjectId, companyNumber, status");
            throw { code: 400, message: "Invalid Parameters - Expected: subjectId, companyNumber, status" };
        }

        if (request.content.status !== AuthorisationStatus.CONFIRMED) {
            log("Invalid parameters - The target status can only be 'confirmed' for invitation acceptance requests");
            throw { code: 400, message: "Invalid Parameters - The status can only be 'confirmed' for invitation acceptance requests" };
        }

        // Authorisation check
        var companyId = getCompany(request.content.companyNumber)._id;
        var subject = getUserById(request.content.subjectId);
        var isMe = (subject._id === actor._id);

        var subjectStatus = getStatus(subject._id, companyId).status;
        var callerStatus = getStatus(actor._id, companyId).status;
        var newStatus = request.content.status;

        var statusChangeResult = allowInviteAcceptance(callerStatus, subjectStatus, newStatus, isCallerAdminUser, isMe);
        if (!statusChangeResult.allowed) {
            log("Blocked status update by user " + actor._id);
            throw { code: 403, message: "status update denied: " + statusChangeResult.message };
        }

        var statusResponse = setStatus(actor._id, subject._id, companyId, request.content.status);

        return {
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
                status: request.content.status,
                previousStatus: statusResponse.oldStatus,
                success: statusResponse.success
            }
        };
    }
    else {
        throw { code: 400, message: "Unknown action " + request.action };
    }
})();
