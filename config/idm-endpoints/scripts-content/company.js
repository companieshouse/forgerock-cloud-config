(function () {

    var RequestAction = {
        GET_USER_COMPANIES: "getUserCompanies",
    };

    function log(message) {
        logger.error("COMPANY PUBLIC ENDPOINT - " + message);
    }

    // Look up a user
    function getUserById(id) {
        var response = openidm.read("managed/alpha_user/" + id, null, ["_id", "userName", "telephoneNumber", "givenName", "memberOfOrg"]);
        return response;
    }

    // Look up a company
    function getCompany(ref) {
        let response = openidm.read(ref, null, ["*", "number", "name", "addressLine1", "addressLine2", 
        "postalCode", "locality", "jurisdiction", "type", "status", "members"]);
        return response;
    }

    function maskEmail(mail) {
        let mailUsername = mail.split("@")[0];
        mailUsername = mailUsername.substring(0, 1).concat("******");
        let mailDomain = mail.split("@")[1].split(".")[0];
        let mailTld = mail.split("@")[1].split(".")[1];
        return mailUsername + "@" + mailDomain + "." + mailTld;
    }

    function maskPhone(phone) {
        return "******".concat(phone.substring(phone.length - 4, phone.length));
    }

    function mapCompanyMembers(companyId, members) {
        let mapped = [];
        members.forEach(member => {
            let fullUser = getUserById(member._refResourceId);
            let status = fullUser.memberOfOrg.find(element => (element._refResourceId === companyId));
            mapped.push({
                _id: fullUser._id,
                name: fullUser.givenName,
                email: maskEmail(fullUser.userName),
                displayName: fullUser.givenName? fullUser.givenName : maskEmail(fullUser.userName),
                phone: fullUser.telephoneNumber ? maskPhone(fullUser.telephoneNumber) : undefined,
                membershipStatus: status._refProperties.membershipStatus
            });
        });
        return mapped;
    }

    var actor = getUserById(context.security.authenticationId);
    log("Caller Id: " + actor._id + "(username: " + actor.userName + ")");

    let companies = [];
    if (actor.memberOfOrg.length > 0) {
        actor.memberOfOrg.forEach(company => {
            let companyInfo = getCompany(company._ref);
            let mappedMembers = mapCompanyMembers(company._refResourceId, companyInfo.members);

            companies.push({
                _id: companyInfo._id,
                name: companyInfo.name,
                number: companyInfo.number,
                membershipStatus: company._refProperties.membershipStatus,
                members: mappedMembers,
                status: companyInfo.status,
                addressLine1: companyInfo.addressLine1,
                addressLine2: companyInfo.addressLine2,
                postalCode: companyInfo.postalCode,
                locality: companyInfo.locality,
                jurisdiction: companyInfo.jurisdiction,
                type: companyInfo.type
            });
        });
    }

    if (request.action === RequestAction.GET_USER_COMPANIES) {
        return companies;
    } else
        if (request.method === "read") {
            return {
                _id: context.security.authenticationId,
                companies: companies
            };
        }
})();
