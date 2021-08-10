(function () {
    
    var OBJECT_USER = "alpha_user";
    var OBJECT_COMPANY = "alpha_organization";
    var USER_RELATIONSHIP = "memberOfOrg";
    var COMPANY_RELATIONSHIP = "members";
    // var INTERNAL_ROLE_MEMBERSHIP_ADMIN = "internal/role/ch-membership-admin";
    var INTERNAL_IDM_ADMINS = [
        "internal/role/openidm-admin",
        "IDAM_FRONT_END_SUPPORT",
        "IDAM_BUSINESS_SUPPORT"
    ];

    var RequestAction = {
        GET_USER_COMPANIES: "getUserCompanies",
    };

    function log(message) {
        logger.error("COMPANY PUBLIC ENDPOINT - " + message);
    }

    function logResponse(response) {
        log("Got response " + response);
    }

    // Look up a uid from a username
    function getUserById(id) {
        // log("Looking up user " + userId);
        var response = openidm.read("managed/" + OBJECT_USER + "/" + id, null, ["_id", "userName", "telephoneNumber", "givenName", "memberOfOrg"]);
        return response;
    }

    // Look up a company from a company number
    function getCompany(ref) {
        // log("Looking up  company " + number);
        let response = openidm.read(ref, null, ["_id", "number", "name", "authCode", "status", "members"]);  
        return response;
    }

    function maskEmail(mail) {
        let mailUsername = mail.split("@")[0];
        mailUsername = mailUsername[0] + mailUsername.substring(1).replace(/./gi, '*');
        let mailDomain = mail.split("@")[1].split(".")[0].replace(/./gi, '*');
        let mailTld = mail.split("@")[1].split(".")[1].replace(/./gi, '*');
    
        return mailUsername + "@" + mailDomain + "." + mailTld;
    }

    function maskPhone(phone) {
        return  phone.substring(0, phone.length-4).concat("****");    
    }

    function mapCompanyMembers(members){
        let mapped = [];
        members.forEach(member => {
            let fullUser =  getUserById(member._refResourceId);
            mapped.push({
                _id: fullUser._id,
                name: fullUser.givenName,
                email: maskEmail(fullUser.userName),
                phone: fullUser.telephoneNumber ? maskPhone(fullUser.telephoneNumber) : undefined
            });
        });
        return mapped;
    }

    var actor = getUserById(context.security.authenticationId);
    log("Caller Id: " + actor._id + "(username: " + actor.userName + ")");

    if (!request.action) {
        log("No action");
        throw {
            code: 400,
            message: "Bad request - no _action parameter"
        };
    }

    if (request.action === RequestAction.GET_USER_COMPANIES) {
    
        let companies = [];
        if(actor.memberOfOrg.length > 0){
            actor.memberOfOrg.forEach(company => {
                let companyInfo = getCompany(company._ref);
                let mappedMembers = mapCompanyMembers(companyInfo.members);
                
                companies.push({
                    _id: companyInfo._id,
                    name: companyInfo.name,
                    number: companyInfo.number,
                    membershipStatus: company._refProperties.membershipStatus,
                    members: mappedMembers
                });
            });
        }

        return companies;
    } else     
    // GET MEMBERSHIP STATUS BY USERNAME AND COMPANY NUMBER
    if (request.method === "read"){
        
    }
})();
