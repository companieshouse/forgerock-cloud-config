(function () {
  const logNowMsecs = new Date().getTime();
  const OBJECT_COMPANY = 'alpha_organization';
  
  var RequestAction = {
    GET_USER_COMPANIES: 'getUserCompanies',
  };
  
  var Defaults = {
    MAX_PAGES: 10,
    CURRENT_PAGE: 1,
    PAGE_SIZE: 10
  };
  
  var StatusFilter = {
    CONFIRMED: 'confirmed',
    PENDING: 'pending',
    NONE: 'none'
  };
  
  function _log (message) {
    logger.error('[CHLOG][GETCOMPANY][' + new Date(logNowMsecs).toISOString() + '] ' + message);
  }

  function _logDebug (message) {
    logger.debug('[CHLOG][GETCOMPANY][' + new Date(logNowMsecs).toISOString() + '] ' + message);
  }
  
  // Look up a user
  function getUserById (id) {
    var response = openidm.read('managed/alpha_user/' + id, null, ['_id', 'userName', 'telephoneNumber',
      'givenName', 'memberOfOrg']);
    return response;
  }
  
  function getCompanies (_refArray) {
    
    if(!_refArray || _refArray.length === 0){
      return [];
    }
    
    let companyIds = _refArray.map(refItem => {
      return '/_id eq "' + refItem._refResourceId + '"' ;      
    });
      
    let searchTerm = companyIds.join(' or ');
    //_log('Search term for companies search: ' + searchTerm);
  
    let response = openidm.query(
      'managed/' + OBJECT_COMPANY,
      { '_queryFilter':  searchTerm},
      ['_id', 'number', 'name', 'authCode', 'authCodeValidFrom', 'authCodeValidUntil', 'status', 'members', 'addressLine1', 'addressLine2',
        'jurisdiction', 'locality', 'postalCode', 'region', 'type', 'creationDate', 'members']
    );
  
    if (response.resultCount === 0) {
      return [];
    }
  
    return response.result;
  }

  function getCompaniesSearch (_refArray, searchTerm) {
    
    if(!_refArray || _refArray.length === 0){
      return [];
    }

    const companyNameFilter = '/name co "' + searchTerm + '"';
    
    let companyIds = _refArray.map(refItem => {
      return '/_id eq "' + refItem._refResourceId + '"' ;      
    });
      
    let companySearchTerm = companyIds.join(' or ');
    //_log('Search term for companies search: ' + searchTerm);
    
    let response = openidm.query(
      'managed/' + OBJECT_COMPANY,
      { '_queryFilter':  companySearchTerm},
      ['_id', 'number', 'name', 'authCode', 'authCodeValidFrom', 'authCodeValidUntil', 'status', 'members', 'addressLine1', 'addressLine2',
        'jurisdiction', 'locality', 'postalCode', 'region', 'type', 'creationDate', 'members']
    );
  
    if (response.resultCount === 0) {
      return [];
    }
  
    return response.result;
  }


  
  function paginate (
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
  
  function mapCompanyMembers (companyId, members) {
    let mapped = [];
    members.forEach(member => {
      let fullUser = getUserById(member._refResourceId);
      let status = fullUser.memberOfOrg.find(element => (element._refResourceId === companyId));
      mapped.push({
        _id: fullUser._id,
        name: fullUser.givenName,
        email: fullUser.userName,
        displayName: fullUser.givenName ? fullUser.givenName : fullUser.userName,
        membershipStatus: status ? status._refProperties.membershipStatus : StatusFilter.NONE
      });
    });
    return mapped;
  }
  
  function mapInviter (inviterId) {
    let mappedUser;
    if (inviterId) {
      let user = getUserById(inviterId);
      if (user) {
        mappedUser = {
          _id: user._id,
          name: user.givenName,
          email: user.userName,
          displayName: user.givenName ? user.givenName : user.userName
        };
      }
    }
    return mappedUser;
  }

  function mapCompanyData (company, companyInfo){
    let mappedMembers = mapCompanyMembers(company._refResourceId, companyInfo.members);
    let inviter;
    let membershipStatus;
        
    if(company._refProperties){
      inviter = mapInviter(company._refProperties.inviterId);
      membershipStatus = company._refProperties.membershipStatus;
    }
  
    return {
      _id: companyInfo._id,
      name: companyInfo.name,
      number: companyInfo.number,
      membershipStatus: company._refProperties.membershipStatus,
      members: membershipStatus === StatusFilter.CONFIRMED ? mappedMembers : null,
      status: companyInfo.status,
      addressLine1: companyInfo.addressLine1,
      addressLine2: companyInfo.addressLine2,
      postalCode: companyInfo.postalCode,
      locality: companyInfo.locality,
      jurisdiction: companyInfo.jurisdiction,
      type: companyInfo.type,
      region: companyInfo.region,
      inviter: inviter
    };
  }

  function getPaginatedCompanies (){
    let currentPage = Number(request.additionalParameters.currentPage) || Defaults.CURRENT_PAGE;
    let pageSize = Number(request.additionalParameters.pageSize) || Defaults.PAGE_SIZE;
    let maxPages = Number(request.additionalParameters.maxPages) || Defaults.MAX_PAGES;
    let statusParam = request.additionalParameters.status;
    let outputCompanies = [];

    //query 1: fetch all associated companies from current user
    const actor = getUserById(context.security.authenticationId);
    const companiesLength = actor.memberOfOrg.length;
    const pagination = paginate(
      companiesLength,
      currentPage,
      pageSize,
      maxPages
    );

    if (companiesLength > 0) {
      // slice data for pagination
      const paginatedAssociatedCompanies = actor.memberOfOrg.slice(pagination.startIndex, pagination.endIndex + 1);

      //query 2: fetch full IDM data set for associated companies (this will get company number too)
      let fetchedCompanies = getCompanies(paginatedAssociatedCompanies);
    
      //prepare response
      paginatedAssociatedCompanies.forEach(company => {
        // let companyInfo = getCompany(company._ref);      
        const companyInfo = fetchedCompanies.find( fetchedCompany => { 
          return (fetchedCompany._id === company._refResourceId);
        });
          
        outputCompanies.push(mapCompanyData(company, companyInfo));
      });

      if(statusParam){
        outputCompanies = getAllCompaniesFromStatus (outputCompanies, statusParam);
      }
    }

    return {
      _id: context.security.authenticationId,
      pagination: pagination,
      results: outputCompanies
    };
  }

  function getPaginatedCompanySearch (){
    let currentPage = Number(request.additionalParameters.currentPage) || Defaults.CURRENT_PAGE;
    let pageSize = Number(request.additionalParameters.pageSize) || Defaults.PAGE_SIZE;
    let maxPages = Number(request.additionalParameters.maxPages) || Defaults.MAX_PAGES;
    let searchTerm = request.additionalParameters.searchTerm;
    let statusParam = request.additionalParameters.status;
    let outputCompanies = [];
    let pagination = null;

    //query 1: fetch all associated companies from current user
    const actor = getUserById(context.security.authenticationId);
    const companiesLength = actor.memberOfOrg.length;

    if (companiesLength > 0) {
      //query 2: fetch full IDM data set for associated companies (this will get company number too)
      let fetchedCompanies = getCompanies(actor.memberOfOrg);
  
      //prepare response
      actor.memberOfOrg.forEach(company => {
        // let companyInfo = getCompany(company._ref);      
        const companyInfo = fetchedCompanies.find( fetchedCompany => { 
          return (fetchedCompany._id === company._refResourceId);
        });

        if(isInSearchTerm(companyInfo, searchTerm)){
          outputCompanies.push(mapCompanyData(company, companyInfo));
        }
      });

      if(statusParam){
        outputCompanies = getAllCompaniesFromStatus (outputCompanies, statusParam);
      }
    }

    pagination = paginate(
      outputCompanies.length,
      currentPage,
      pageSize,
      maxPages
    );

    return {
      _id: context.security.authenticationId,
      pagination: pagination,
      results: outputCompanies.slice(pagination.startIndex, pagination.endIndex + 1)
    };
  }

  function getAllCompanyData (){
    //query 1: fetch all associated companies from current user
    var actor = getUserById(context.security.authenticationId);
    let outputCompanies = [];

    if (actor.memberOfOrg.length > 0) {
      //query 2: fetch full IDM data set for associated companies (this will get company number too)
      let fetchedCompanies = getCompanies( actor.memberOfOrg);
    
      //prepare response
      actor.memberOfOrg.forEach(company => {
        // let companyInfo = getCompany(company._ref);      
        const companyInfo = fetchedCompanies.find( fetchedCompany => { 
          return (fetchedCompany._id === company._refResourceId);
        });
          
        outputCompanies.push(mapCompanyData(company, companyInfo));
      });
    }
    return outputCompanies;
  }
  
  function getAllCompaniesFromStatus (outputCompanies, statusParam){
    if(![StatusFilter.CONFIRMED, StatusFilter.PENDING].includes(statusParam)){
      throw {
        code: 400,
        message: 'Invalid value for status filter. Allowed values are [confirmed, pending]'
      };
    }

    return outputCompanies.filter(comp => {
      return (comp.membershipStatus === statusParam);
    });
  }

  function isInSearchTerm (company, searchTerm){
    return company.name.toUpperCase().indexOf(searchTerm.toUpperCase()) > -1 || company.number.toUpperCase().indexOf(searchTerm.toUpperCase()) > -1;
  }

  let searchTerm = request.additionalParameters.searchTerm;
  
  if (request.action === RequestAction.GET_USER_COMPANIES) {
    return getAllCompanyData();
  } else if (request.method === 'read' && searchTerm ) {
    return getPaginatedCompanySearch();
  } else {
    return getPaginatedCompanies();
  }
})();
  