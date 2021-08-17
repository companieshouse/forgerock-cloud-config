(function () {

    function paginate(
        totalItems,
        currentPage,
        pageSize,
        maxPages
    ) {
        // calculate total pages
        let totalPages = Math.ceil(totalItems / pageSize);

        // ensure current page isn't out of range
        if (currentPage < 1) {
            currentPage = 1;
        } else if (currentPage > totalPages) {
            currentPage = totalPages;
        }

        let startPage, endPage;
        if (totalPages <= maxPages) {
            // total pages less than max so show all pages
            startPage = 1;
            endPage = totalPages;
        } else {
            // total pages more than max so calculate start and end pages
            let maxPagesBeforeCurrentPage = Math.floor(maxPages / 2);
            let maxPagesAfterCurrentPage = Math.ceil(maxPages / 2) - 1;
            if (currentPage <= maxPagesBeforeCurrentPage) {
                // current page near the start
                startPage = 1;
                endPage = maxPages;
            } else if (currentPage + maxPagesAfterCurrentPage >= totalPages) {
                // current page near the end
                startPage = totalPages - maxPages + 1;
                endPage = totalPages;
            } else {
                // current page somewhere in the middle
                startPage = currentPage - maxPagesBeforeCurrentPage;
                endPage = currentPage + maxPagesAfterCurrentPage;
            }
        }

        // calculate start and end item indexes
        let startIndex = (currentPage - 1) * pageSize;
        let endIndex = Math.min(startIndex + pageSize - 1, totalItems - 1);

        // create an array of pages to ng-repeat in the pager control
        let pages = Array.from(Array((endPage + 1) - startPage).keys()).map(i => startPage + i);

        // return object with all pager properties required by the view
        return {
            totalItems: totalItems,
            currentPage: currentPage,
            pageSize: pageSize,
            totalPages: totalPages,
            startPage: startPage,
            endPage: endPage,
            startIndex: startIndex,
            endIndex: endIndex,
            pages: pages
        };
    }

    var RequestAction = {
        GET_USER_COMPANIES: "getUserCompanies",
    };

    var Defaults = {
        MAX_PAGES: 10,
        CURRENT_PAGE: 1,
        PAGE_SIZE: 10
    };

    var StatusFilter = {
        CONFIRMED: "confirmed",
        PENDING: "pending"
    };

    function log(message) {
        logger.error("COMPANY PUBLIC ENDPOINT - " + message);
    }

    // Look up a user
    function getUserById(id) {
        var response = openidm.read("managed/alpha_user/" + id, null, ["_id", "userName", "telephoneNumber",
            "givenName", "memberOfOrg"]);
        return response;
    }

    // Look up a company
    function getCompany(ref) {
        let response = openidm.read(ref, null, ["*", "number", "name", "addressLine1", "addressLine2",
            "postalCode", "locality", "jurisdiction", "type", "status", "region", "members"]);
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
                displayName: fullUser.givenName ? fullUser.givenName : maskEmail(fullUser.userName),
                phone: fullUser.telephoneNumber ? maskPhone(fullUser.telephoneNumber) : undefined,
                membershipStatus: status._refProperties.membershipStatus
            });
        });
        return mapped;
    }

    function mapInviter(inviterId) {
        let mappedUser;
        if (inviterId) {
            let user = getUserById(inviterId);
            if (user) {
                mappedUser = {
                    _id: user._id,
                    name: user.givenName,
                    email: maskEmail(user.userName),
                    displayName: user.givenName ? user.givenName : maskEmail(user.userName),
                    phone: user.telephoneNumber ? maskPhone(user.telephoneNumber) : undefined,
                };
            }
        }
        return mappedUser;
    }

    var actor = getUserById(context.security.authenticationId);
    log("Caller Id: " + actor._id + "(username: " + actor.userName + ")");

    let companies = [];
    if (actor.memberOfOrg.length > 0) {
        actor.memberOfOrg.forEach(company => {
            let companyInfo = getCompany(company._ref);
            let mappedMembers = mapCompanyMembers(company._refResourceId, companyInfo.members);
            let inviter = mapInviter(company._refProperties.inviterId);

            companies.push({
                _id: companyInfo._id,
                name: companyInfo.name,
                number: companyInfo.number,
                membershipStatus: company._refProperties.membershipStatus,
                members: company._refProperties.membershipStatus === 'confirmed' ? mappedMembers : null,
                status: companyInfo.status,
                addressLine1: companyInfo.addressLine1,
                addressLine2: companyInfo.addressLine2,
                postalCode: companyInfo.postalCode,
                locality: companyInfo.locality,
                jurisdiction: companyInfo.jurisdiction,
                type: companyInfo.type,
                region: companyInfo.region,
                inviter: inviter
            });
        });
    }

    if (request.action === RequestAction.GET_USER_COMPANIES) {
        return companies;
    } else
        if (request.method === "read") {

            let currentPage = request.additionalParameters.currentPage || Defaults.CURRENT_PAGE;
            let pageSize = request.additionalParameters.pageSize || Defaults.PAGE_SIZE;
            let maxPages = request.additionalParameters.maxPages || Defaults.MAX_PAGES;
            let searchTerm = request.additionalParameters.searchTerm;
            let statusParam = request.additionalParameters.status;
            
            // apply search term filter
            if (searchTerm) {
                companies = companies.filter(comp => {
                    return (comp.name.indexOf(searchTerm) > -1 || comp.number.indexOf(searchTerm) > -1);
                });
            }

            // apply status filter
            if(statusParam){

                if(![StatusFilter.CONFIRMED, StatusFilter.PENDING].includes(statusParam)){
                    throw {
                        code: 400,
                        message: "Invalid value for status filter. Allowed values are [confirmed, pending]"
                    };
                }

                companies = companies.filter(comp => {
                    return (comp.membershipStatus === statusParam);
                });
            }

            let pagination = paginate(
                companies.length,
                currentPage,
                pageSize,
                maxPages
            );

            return {
                _id: context.security.authenticationId,
                pagination: pagination,
                results: companies.slice(pagination.startIndex, pagination.endIndex + 1)
            };
        }
})();
