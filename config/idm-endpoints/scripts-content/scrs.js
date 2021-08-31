(function () {

    var OBJECT_USER = "alpha_user";
    var OBJECT_COMPANY = "alpha_organization";
    let companyIncorporationsEndpoint = "https://v79uxae8q8.execute-api.eu-west-1.amazonaws.com/mock/submissions";
    let emailsEndpoint = "https://v79uxae8q8.execute-api.eu-west-1.amazonaws.com/mock/authorisedForgerockEmails";
    let amEndpoint = "https://openam-companieshouse-uk-dev.id.forgerock.io";
    let customUiUrl = "https://idam-ui.amido.aws.chdev.org";
    let idmUsername = "tree-service-user@companieshouse.com";
    let idmPassword = "Passw0rd123!";

    var AuthorisationStatus = {
        CONFIRMED: "confirmed",
        PENDING: "pending",
        NONE: "none"
    };
    
    function log(message) {
        logger.error("SCRS - " + message);
    }

    function formatDate() {
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
        result.push("Z");
        return result.join('');
    }
    
    function padding(num) {
        return num < 10 ? '0' + num : num;
    }

    // Look up a user
    function getUserById(id) {
        var response = openidm.read("managed/alpha_user/" + id, null, ["_id", "userName", "telephoneNumber",
            "givenName", "memberOfOrg"]);
        return response;
    }

    // Look up a uid from a username
    function getUserByUsername(username) {
        // log("Looking up user " + username);
        var response = openidm.query("managed/" + OBJECT_USER,
            { "_queryFilter": "/userName eq \"" + username + "\"" },
            ["_id", "userName", "givenName", "roles", "authzRoles", "memberOfOrg"]);

        if (response.resultCount !== 1) {
            log("getUserByUsername: Bad result count: " + response.resultCount);
            return null;
        }

        return response.result[0];
    }

    // Look up a company from a company number
    function getCompany(number) {
        // log("Looking up  company " + number);
        var response = openidm.query("managed/" + OBJECT_COMPANY,
            { "_queryFilter": "/number eq \"" + number + "\"" },
            ["_id", "number", "name", "authCode", "status", "members", "addressLine1", "addressLine2",
                "authCodeIsActive", "jurisdiction", "locality", "postalCode", "region", "type", "members"]);

        if (response.resultCount === 0) {
            //log("getCompany: Bad result count: " + response.resultCount);
            return null;
        }

        return response.result[0];
    }

    function callNotificationJourney(email, link, companyName, companyNumber, isNewUser){
        let request = {
            "url": amEndpoint + "/am/json/alpha/authenticate?authIndexType=service&authIndexValue=SCRS_Emails&noSession=true",
            "method": "POST",
            "headers": {
                "Content-Type": "application/json",
                "CH-Username": idmUsername,
                "CH-Password": idmPassword,
                "NofificationLink": link,
                "NofificationEmail": email,
                "NotificationCompanyNumber": companyNumber,
                "NotificationCompanyName": companyName,
                "NewUser" : isNewUser
            }
        };
        // log("request URL emails: " + emailsEndpoint + "?companyNo=" + companyIncorp.company_number);

        return openidm.action("external/rest", "call", request);
    }

    function fetchAuthorizationToken(){
        //TODO implement authN logic to fetch Bearer token 
        return "Bearer 1234abcde"
    }

    // Creates a relationship between the user and company
    function addConfirmedRelationshipToCompany(subjectId, companyId, companyLabel) {

        // var currentStatusResponse = getStatus(subjectId, companyId);

        // //if the user has a pending relationship with the company, remove it
        // if (currentStatusResponse.status === AuthorisationStatus.PENDING) {
        //     log("The user has already a PENDING relationship with the company ");
        //     var deleteResponse = deleteRelationship(subjectId, companyId);
        //     if (!deleteResponse.success) {
        //         return {
        //             success: false
        //         }
        //     }
        // }

        var payload = [
            {
                operation: "add",
                field: "/memberOfOrg/-",
                value: {
                    _ref: "managed/alpha_organization/" + companyId,
                    _refProperties: {
                        membershipStatus: AuthorisationStatus.CONFIRMED,
                        companyLabel: companyLabel,
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


    function minusHours(h) {
        var date = new Date();
        date.setHours(date.getHours() - h);
        return date;
    }

    let date = minusHours(4);

    let defaultTimepoint = [
        date.getFullYear(),
        padding(date.getMonth() + 1),
        // (date.getMonth() + 1) > 9 ? (date.getMonth() + 1) : '0' + (date.getMonth() + 1),
        padding(date.getDate()),
        // date.getDate() > 9 ? date.getDate() : '0' + date.getDate(),
        padding(date.getHours()),
        // date.getHours() > 9 ? date.getHours() : '0' + date.getHours(),
        padding(date.getMinutes()),
        // date.getMinutes() > 9 ? date.getMinutes() : '0' + date.getMinutes(),
        padding(date.getSeconds()),
        // date.getSeconds() > 9 ? date.getSeconds() : '0' + date.getSeconds(),
        date.getMilliseconds()
    ].join("");

    log("Starting timepoint: " + defaultTimepoint);
    let timePoint = request.additionalParameters.timepoint || defaultTimepoint;

    if (request.method === "read") {

        let request = {
            "url": companyIncorporationsEndpoint + "?timepoint=" + timePoint,
            "method": "GET",
            "headers": {
                "Content-Type": "application/json",
                "Authorization": fetchAuthorizationToken()
            }
        };
        // log("request URL: " + companyIncorporationsEndpoint + "?timepoint=" + timePoint);
        let incorporationsResponse = openidm.action("external/rest", "call", request);

        let incorporations = JSON.parse(incorporationsResponse);
        incorporations.items.forEach(companyIncorp => {
            if (companyIncorp.transaction_type === "incorporation" && companyIncorp.transaction_status === "accepted") {

                let companyInfo = getCompany(companyIncorp.company_number);


                if (!companyInfo) {
                    log("Company not found: " + companyIncorp.company_number);
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
                    }).join(",");

                    let request = {
                        "url": emailsEndpoint + "?companyNo=" + companyIncorp.company_number,
                        "method": "GET",
                        "headers": {
                            "Content-Type": "application/json",
                            "Authorization": fetchAuthorizationToken()
                        }
                    };

                    let emailsResponse = openidm.action("external/rest", "call", request);

                    if (emailsResponse.items) {
                        emailsResponse.items.forEach(email => {
                            let userLookup = getUserByUsername(email);
                            if (allMembersEmailsString.indexOf(email) > -1) {
                                let userObj = allMembers.find(element => (element.email === email));
                                log("The user with email : " + email + " is already a member of company " + companyInfo.name + " - status: " + userObj.status);
                                // TODO IF THE USER HAS A CONFIRMED RELATIONSHIP, LEAVE IT
                                // TODO IF THE USER HAS A PENDING RELATIONSHIP, ???????                            
                            } else {
                                log("The user with email : " + email + " is NOT a member of company " + companyInfo.name);
                                if (!userLookup) {
                                    // CREATE THE USER + CREATE RELATIONSHIP + SEND EMAIL TO THE USER
                                    log("Creating new user with username " + email);
                                    var onboardingDate = formatDate();
                                    let createRes = openidm.create("managed/" + OBJECT_USER,
                                        null,
                                        {
                                            "userName": email,
                                            "sn": email,
                                            "mail": email,
                                            "frIndexedDate2": onboardingDate
                                        });
                                    log("Create User ID: " + createRes._id);
                                    addConfirmedRelationshipToCompany(createRes._id, companyInfo._id, companyInfo.name + " - " + companyInfo.number);
                                    let notificationResponse = callNotificationJourney(email, customUiUrl, companyInfo.name, companyInfo.number, true);
                                    log("notification response : " + JSON.stringify(notificationResponse));
                                } else {
                                    // IF YES, CREATE THE RELATIONSHIP AND SEND EMAIL
                                    addConfirmedRelationshipToCompany(userLookup._id, companyInfo._id, companyInfo.name + " - " + companyInfo.number);
                                    let notificationResponse = callNotificationJourney(email, customUiUrl, companyInfo.name, companyInfo.number, false);
                                    log("notification response : " + JSON.stringify(notificationResponse));
                                }
                            }
                        })
                    }

                    companyIncorp.authz_users = emailsResponse.items
                }
            }
        });

        return {
            _id: context.security.authenticationId,
            results: incorporations.items
        };
    }
})();
