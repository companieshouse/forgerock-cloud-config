(function(){

    // Configuration

    var OBJECT_USER = "alpha_user";
    var OBJECT_COMPANY = "alpha_organization";
    var USER_RELATIONSHIP = "memberOfOrg";
    var COMPANY_RELATIONSHIP = "members";
    var INTERNAL_ROLE_MEMBERSHIP_ADMIN = "internal/role/ch-membership-admin";

    // Values for the memberOfOrg/members relationship property "status"

    var AuthorisationStatus = {
        APPROVED: "approved",
        PENDING: "pending",
        INVITED: "invited",
        NONE: "none"
    };

    // Endpoint actions

    var RequestAction = {
        GET_STATUS: "getStatus",
        SET_STATUS: "setStatus",
        GET_USERS: "getUsers",
        GET_COMPANIES: "getCompanies",
        GET_USER: "getUser",
        GET_COMPANY: "getCompany"
    };

    // Debug loggers

    function log(message) {
        logger.debug("AUTHEND " + message);
    }

    function logResponse(response) {
        log("Got response " + response);
    }

    // Fetch current status for user vs. company

    function getStatus(user,company) {

        var status = AuthorisationStatus.NONE;
        var membership = null;

        var response = openidm.query("managed/" + OBJECT_USER + "/" + user + "/" + USER_RELATIONSHIP,
            { "_queryFilter": "true"},
            ["_refProperties/status"]);

        logResponse(response);

        if (response.resultCount === 0) {
            log ("No companies currently authorised");
        }
        else {
            response.result.forEach(function (entry) {
                log("Got company " + entry._refResourceId);
                if (entry._refResourceId === company) {
                    status = entry._refProperties.status;
                    log("Got a match - status " + status);
                    membership = entry._id;
                }
            });
        }

        return { status: status, membership: membership };

    }

    // Update status for user vs. company

    function setStatus(user,company,status) {

        var statusResponse = getStatus(user,company);

        if (statusResponse.status === AuthorisationStatus.NONE) {
            log("Creating new relationship for company " + company + " with status " + status);
            openidm.create("managed/" + OBJECT_USER + "/" + user + "/" + USER_RELATIONSHIP,
                null,
                {
                    "_ref": "managed/" + OBJECT_COMPANY + "/" + company,
                    "_refProperties": {
                        "status": status
                    }
                });
        }
        else if (statusResponse.status === status) {
            log("Status already " + status);
        }
        else {
            log("Updating status from " + statusResponse.status + " to " + status + " for company " + company);

            var newobject = openidm.patch("managed/" + OBJECT_USER + "/" + user + "/" + USER_RELATIONSHIP + "/" + statusResponse.membership,
                null,
                [{
                    operation: "replace",
                    field: "/_refProperties/status",
                    value: status
                }]);
        }


        return { success: true, oldStatus: statusResponse.status};

    }

    // Look up a uid from a username

    function getUser(username) {
        log("Looking up  user " + username);
        var response = openidm.query("managed/" + OBJECT_USER,
            { "_queryFilter": "/userName eq \"" + username + "\""},
            ["_id"]);

        if (response.resultCount !== 1) {
            log("Bad result count " + response.resultCount);
            return null;
        }

        return response.result[0]._id;
    }

    // Look up a company uid from a company number

    function getCompany(number) {
        log("Looking up  company " + number);
        var response = openidm.query("managed/" + OBJECT_COMPANY,
            { "_queryFilter": "/number eq \"" + number + "\""},
            ["_id"]);

        if (response.resultCount !== 1) {
            log("Bad result count " + response.resultCount);
            return null;
        }

        return response.result[0]._id;
    }

    // Fetch all users who are associated with a given company
    // Optionally filter on status

    function getAuthorisedUsers(company,status) {
        var users = [];

        // Fetch all records and filter results (can't search on relationship property)

        var response = openidm.query("managed/" + OBJECT_COMPANY + "/" + company + "/" + COMPANY_RELATIONSHIP,
            { "_queryFilter": "true"},
            ["userName", "_refProperties/status"]);

        logResponse(response);

        if (response.resultCount === 0) {
            log ("No users currently authorised");
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
            { "_queryFilter": "true"},
            ["name", "number", "_refProperties/status"]);

        logResponse(response);

        if (response.resultCount === 0) {
            log ("No companies currently authorised");
        }
        else {
            response.result.forEach(function (entry) {
                log("Got company " + entry._refResourceId);
                companies.push({number: entry.number, name: entry.name, uid: entry._refResourceId,status: entry._refProperties.status})
            });
        }

        return companies;
    }

    // Authorisation logic for a user changing the current status of membership

    function allowStatusChange(callerStatus, subjectStatus, newStatus, isAdminUser, isMe) {

        log("Access control for callerStatus " + callerStatus + " subjectStatus " + subjectStatus + " newStatus " + newStatus + " isAdminUser " + isAdminUser + " isMe " + isMe);

        if (isAdminUser) {
            log("Allowing status change by admin");
            return true;
        }

        if (callerStatus === AuthorisationStatus.APPROVED &&
            newStatus === AuthorisationStatus.INVITED) {
            log("Allowing invitation");
            return true;
        }

        if (callerStatus === AuthorisationStatus.APPROVED &&
            subjectStatus === AuthorisationStatus.PENDING &&
            newStatus === AuthorisationStatus.APPROVED) {
            log("Allowing approval");
            return true;
        }

        if (isMe &&
            subjectStatus === AuthorisationStatus.INVITED &&
            newStatus === AuthorisationStatus.APPROVED) {
            log("Allowing invitation acceptance");
            return true;
        }

        if (isMe &&
            newStatus === AuthorisationStatus.PENDING) {
            log("Allowing application");
            return true;
        }

        return false;

    }

    // Entrypoint

    var callingUser = context.security.authenticationId;
    var isAdminUser = (context.security.authorization.roles.indexOf(INTERNAL_ROLE_MEMBERSHIP_ADMIN) !== -1);
    var subject = request.content.subject;
    var isMe = false;

    if (!subject || subject === callingUser) {
        log("Calling on own behalf");
        isMe = true;
        subject = callingUser;
    }

    log("Endpoint starting - calling user " + callingUser + " subject " + subject + " action " + request.action);
    log("Admin: " + isAdminUser + " roles " + context.security.authorization.roles);

    if (!request.action) {
        log("No action");
        throw { code : 400, message : "Bad request - no _action parameter" };
    }

    if (request.action === RequestAction.GET_USER) {

        log("Get user request");

        return {
            caller: callingUser,
            subject: getUser(request.content.username)
        };
    }
    else if (request.action === RequestAction.GET_COMPANY) {

        log("Get company request");

        return {
            caller: callingUser,
            company: getCompany(request.content.number)
        };
    }
    else if (request.action === RequestAction.GET_STATUS) {

        log("Get status request");

        // Authorisation check - must be admin or getting own status

        if (!(isAdminUser || isMe)) {
            log("Blocked status request by user " + callingUser);
            throw { code : 403, message : "Forbidden" };
        }

        var statusResponse = getStatus(subject,request.content.company);

        return {
            caller: callingUser,
            subject: subject,
            company: request.content.company,
            status: statusResponse.status
        };
    }
    else if (request.action === RequestAction.SET_STATUS) {

        log("Set status request");

        // Authorisation check

        var subjectStatus = getStatus(subject,request.content.company).status;
        var callerStatus = (isMe) ? subjectStatus : getStatus(callingUser,request.content.company).status;
        var newStatus = request.content.status;

        if (!allowStatusChange(callerStatus, subjectStatus, newStatus, isAdminUser, isMe)) {
            log("Blocked status update by user " + callingUser);
            throw { code : 403, message : "Forbidden" };
        }

        var statusResponse = setStatus(subject, request.content.company, request.content.status);

        return {
            caller: callingUser,
            subject: subject,
            company: request.content.company,
            status: request.content.status,
            previousstatus: statusResponse.oldStatus,
            success: statusResponse.success
        };
    }
    else if (request.action === RequestAction.GET_USERS) {
        log("Get users request");

        // Authorisation check - must be admin or approved member for company

        if (!isAdminUser && getStatus(subject,request.content.company).status !== AuthorisationStatus.APPROVED) {
            log("Blocked users query user " + callingUser);
            throw { code : 403, message : "Forbidden" };
        }

        var response = getAuthorisedUsers(request.content.company, request.content.status);

        return {
            caller: callingUser,
            subject: subject,
            company: request.content.company,
            status: request.content.status,
            users: response
        };
    }
    else if (request.action === RequestAction.GET_COMPANIES) {
        log("Get companies request");

        // Authorisation check - must be admin or getting own companies

        if (!(isAdminUser || isMe)) {
            log("Blocked companies request by user " + callingUser);
            throw { code : 403, message : "Forbidden" };
        }

        var response = getAuthorisedCompanies(subject);

        return {
            caller: callingUser,
            subject: subject,
            companies: response
        };
    }
    else {
        throw { code : 400, message : "Unknown action " + request.action };
    }
})();
