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
        //      INVITED: "invited",
        NONE: "none"
    };

    // Endpoint actions

    var RequestAction = {
        GET_STATUS_BY_USERNAME: "getCompanyStatusByUsername",
        GET_STATUS_BY_USERID: "getCompanyStatusByUserId",
        SET_STATUS_BY_USERNAME: "setCompanyStatusByUsername",
        SET_STATUS_BY_USERID: "setCompanyStatusByUserId",
        GET_COMPANY: "getCompanyByNumber"
        // GET_USERS: "getUsers",
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

    // Authorisation logic for a user changing the current status of membership
    function allowStatusChange(callerStatus, subjectStatus, newStatus, isAdminUser, isMe) {

        log("Access control for callerStatus " + callerStatus + " subjectStatus " + subjectStatus + " newStatus " + newStatus + " isAdminUser " + isAdminUser + " isMe " + isMe);

        if (isAdminUser) {
            log("Caller is admin - changing from '" + subjectStatus + "' to '" + newStatus + "' allowed");
            return {
                allowed: true
            };
        }

        if (callerStatus === AuthorisationStatus.CONFIRMED &&
            subjectStatus === AuthorisationStatus.PENDING &&
            newStatus === AuthorisationStatus.CONFIRMED) {
            log("Caller is already authorised - changing from PENDING to CONFIRMED allowed");
            return {
                allowed: true
            };
        }

        if (callerStatus === AuthorisationStatus.CONFIRMED &&
            subjectStatus === AuthorisationStatus.NONE &&
            newStatus === AuthorisationStatus.PENDING) {
            log("Caller is already authorised - changing from NONE to PENDING allowed");
            return {
                allowed: true
            };
        }

        if (callerStatus === AuthorisationStatus.CONFIRMED &&
            subjectStatus === AuthorisationStatus.CONFIRMED &&
            newStatus === AuthorisationStatus.PENDING) {
            log("Caller is already authorised - subject status for company is already CONFIRMED, cannot set it to PENDING - Status change denied");
            return {
                allowed: false,
                message: "subject status for company is already CONFIRMED, cannot set it to PENDING"
            };
        }

        if (callerStatus === AuthorisationStatus.CONFIRMED &&
            subjectStatus === AuthorisationStatus.PENDING &&
            newStatus === AuthorisationStatus.PENDING) {
            log("Caller is already authorised - subject status for company is already PENDING - Status change allowed");
            return {
                allowed: true
            };
        }
        // if (isMe &&
        //     newStatus === AuthorisationStatus.PENDING) {
        //     log("Allowing application");
        //     return true;
        // }

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
    var isAdminUser = JSON.stringify(actor.authzRoles).indexOf(INTERNAL_IDM_ADMIN) !== -1;
    log("Is Caller an Admin (openidm-admin role): " + isAdminUser);

    if (!request.action) {
        log("No action");
        throw { code: 400, message: "Bad request - no _action parameter" };
    }

    // GET MEMBERSHIP STATUS BY USERNAME AND COMPANY NUMBER
    if (request.action === RequestAction.GET_STATUS_BY_USERNAME) {

        log("Get status request by Username");

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

        // if (!(isAdminUser || isMe)) {
        //     log("Blocked status request by user " + callingUser._id);
        //     throw { code: 403, message: "Forbidden" };
        // }

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

        log("Get status request by UserID");

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

        // if (!(isAdminUser || isMe)) {
        //     log("Blocked status request by user " + callingUser._id);
        //     throw { code: 403, message: "Forbidden" };
        // }

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
    else if (request.action === RequestAction.SET_STATUS_BY_USERID) {

        log("Set membership status request by userid");
         
        if (!request.content.subjectId || !request.content.companyNumber || !request.content.status) {
            log("Invalid parameters - Expected: subjectId, companyNumber, status");
            throw { code: 400, message: "Invalid Parameters - Expected: subjectId, companyNumber, status" };
        }

        if (request.content.status !== AuthorisationStatus.PENDING) {
            log("Invalid parameters - The status can only be 'pending'");
            throw { code: 400, message: "Invalid Parameters - The status can only be 'pending'" };
        }

        // Authorisation check
        var companyId = getCompany(request.content.companyNumber)._id;
        var subject = getUserById(request.content.subjectId);
        var isMe = (subject._id === actor._id);

        var subjectStatus = getStatus(subject._id, companyId).status;
        var callerStatus = (isMe) ? subjectStatus : getStatus(actor._id, companyId).status;
        var newStatus = request.content.status;

        var statusChangeResult = allowStatusChange(callerStatus, subjectStatus, newStatus, isAdminUser, isMe);
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
    else if (request.action === RequestAction.SET_STATUS_BY_USERNAME) {

        log("Set membership status request by username");

        if (!request.content.subjectUserName || !request.content.companyNumber || !request.content.status) {
            log("Invalid parameters - Expected: subjectUserName, companyNumber, status");
            throw { code: 400, message: "Invalid Parameters - Expected: subjectUserName, companyNumber, status" };
        }

        if (request.content.status !== AuthorisationStatus.PENDING) {
            log("Invalid parameters - The status can only be 'pending'");
            throw { code: 400, message: "Invalid Parameters - The status can only be 'pending'" };
        }

        // Authorisation check
        var companyId = getCompany(request.content.companyNumber)._id;
        var subject = getUserByUsername(request.content.subjectUserName);
        var isMe = (subject._id === actor._id);

        var subjectStatus = getStatus(subject._id, companyId).status;
        var callerStatus = getStatus(actor._id, companyId).status;
        var newStatus = request.content.status;

        var statusChangeResult = allowStatusChange(callerStatus, subjectStatus, newStatus, isAdminUser, isMe);
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

        log("Get company request");

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
    else {
        throw { code: 400, message: "Unknown action " + request.action };
    }
})();
