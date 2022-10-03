(function () {
  const logNowMsecs = new Date().getTime();
  const SYSTEM_CHS_COMPANY = 'system/CHSCompany/company_profile';
  const SYSTEM_WEBFILING_AUTHCODE = 'system/WebfilingAuthCode/authCode';
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
  
  //return the source data from EWF/CHS for the given list of companies
  function getCompaniesDataFromSource (companyArray) {
    let companiesSourceData;
    let authCodesSourceData;
    
    if(!companyArray || companyArray.length === 0){
      _log('[SEARCH COMPANY DATA IN CHS] User has no companies to lookup');
      return null;
    }

    let companyNumbers = companyArray.map(company => {
      return '/_id eq "' + company.number + '"' ;      
    });
      
    let searchTerm = companyNumbers.join(' or ');
    _log('[SEARCH COMPANY IN CHS] search term: ' + searchTerm);
  
    try {
      let chsResponse = openidm.query(
        SYSTEM_CHS_COMPANY,
        { '_queryFilter': searchTerm }
      );
      
      _log('[SEARCH COMPANY IN CHS] CHS companies response: '+ chsResponse);
      _log('[SEARCH COMPANY IN CHS] No. of results of CHS query for companies: ' + chsResponse.resultCount);
      //_log('Response from CHS : ' + JSON.stringify(chsResponse.result));
  
      companiesSourceData = chsResponse.result;
    } catch (e) {
      _log('[SEARCH COMPANY DATA IN CHS] Error during company lookup from CHS : ' + e);
      return {
        success: false,
        message: 'Error during company lookup from CHS : ' + e
      };
    }
    
    try {
      let ewfResponse = openidm.query(
        SYSTEM_WEBFILING_AUTHCODE,
        { '_queryFilter': searchTerm }
      );
      
      _log('[SEARCH AUTH CODE IN EWF] EWF aut codes response: '+ ewfResponse);
      _log('[SEARCH AUTH CODE IN EWF] No. of results of  EWF query for auth codes: ' + ewfResponse.resultCount);
      //_log('Response from EWF : ' + JSON.stringify(ewfResponse.result));
      authCodesSourceData = ewfResponse.result;
    } catch (e) {
      _log('[SEARCH AUTH CODE IN EWF] Error during lookup of auth code search from EWF : ' + e);
      return {
        success: false,
        message: 'Error during lookup of auth code search from EWF : ' + e
      };
    }

    return {
      success: true,
      companiesSourceData: companiesSourceData,
      authCodesSourceData: authCodesSourceData
    };    
  }
  
  function createPatchItem (fieldName, value) {
    if (!value || typeof (value) === 'undefined') {
      return {
        'operation': 'remove',
        'field': '/' + fieldName
      };
    } else return {
      'operation': 'replace',
      'field': '/' + fieldName,
      'value': value
    };
  }
  
  function mapCHSCompanyJurisdiction (jurisdiction) {
    if (jurisdiction === 'england-wales' || jurisdiction === 'wales' || jurisdiction === 'england') {
      return 'EW';
    } else if (jurisdiction === 'scotland') {
      return 'SC';
    } else if (jurisdiction === 'northern-ireland') {
      return 'NI';
    } else {
      return jurisdiction;
    }
  }
  
  //updates company data from the source
  function updateCompanyData (fetchedCompanies, sourceData){
    
    let companiesSourceData = sourceData.companiesSourceData;
    let authCodesSourceData = sourceData.authCodesSourceData;
      
    let updatedCompanies = [];
    try {
      fetchedCompanies.forEach(company => {
  
        let sourceCompany = companiesSourceData.find(sourceCompany => {
          return (sourceCompany.data.company_number === company.number);
        });
  
        let sourceAuthCode = authCodesSourceData.find(sourceAuthCode => {
          return (sourceAuthCode && sourceAuthCode._id === company.number);
        });
          
        let patchItems = [];
          
        if(sourceAuthCode){
          if(sourceAuthCode.AUTHCODE !== company.authCode){
            _log('[UPDATE COMPANY] Auth code AUTHCODE at source different from auth code in IDM for company ' + company.number);
            patchItems.push(createPatchItem('authCode', sourceAuthCode.AUTHCODE));
          }
          if(sourceAuthCode.STARTDTE !== company.authCodeValidFrom){
            _log('[UPDATE COMPANY] Auth code STARTDTE at source different from auth code in IDM for company ' + company.number);
            patchItems.push(createPatchItem('authCodeValidFrom', sourceAuthCode.STARTDTE));
          } 
          if(sourceAuthCode.EXPIRYDTE !== company.authCodeValidUntil){
            _log('[UPDATE COMPANY] Auth code EXPIRYDTE at source different from auth code in IDM for company ' + company.number);
            patchItems.push(createPatchItem('authCodeValidUntil', sourceAuthCode.EXPIRYDTE));
          } 
        } else {
          _log('Auth Code data not found at source (EWF AUTHCODE table) for company ' + company.number);
        }
  
        if(sourceCompany && sourceCompany.data){
          if(sourceCompany.data.company_name !== company.name){
            _log('[UPDATE COMPANY] Company name at source different from the one IDM for company ' + company.number);
            patchItems.push(createPatchItem('name', sourceCompany.data.company_name));
          }
          if(sourceCompany.data.type !== company.type){
            _log('[UPDATE COMPANY] Company type at source different from the one in IDM for company ' + company.number);
            patchItems.push(createPatchItem('type', sourceCompany.data.type));
          }
          if(sourceCompany.data.company_status !== company.status){
            _log('[UPDATE COMPANY] Company status at source different from the one in IDM for company ' + company.number);
            patchItems.push(createPatchItem('status', sourceCompany.data.company_status));
          }       
          if(sourceCompany.data.registered_office_address.locality !== company.locality){
            _log('[UPDATE COMPANY] Company locality at source different from the one in IDM for company ' + company.number);
            patchItems.push(createPatchItem('locality', sourceCompany.data.registered_office_address.locality));
          }            
          if(sourceCompany.data.registered_office_address.postal_code !== company.postalCode){
            _log('[UPDATE COMPANY] Company postal code at source different from the one in IDM for company ' + company.number);
            patchItems.push(createPatchItem('postalCode', sourceCompany.data.registered_office_address.postal_code));
          }
          if(sourceCompany.data.registered_office_address.address_line_1 !== company.addressLine1){
            _log('[UPDATE COMPANY] Company address line 1 at source different from the one in IDM for company ' + company.number);
            patchItems.push(createPatchItem('addressLine1', sourceCompany.data.registered_office_address.address_line_1));
          }
          if(sourceCompany.data.registered_office_address.address_line_2 !== company.addressLine2){
            _log('[UPDATE COMPANY] Company address line 2 at source different from the one in IDM for company ' + company.number);
            patchItems.push(createPatchItem('addressLine2', sourceCompany.data.registered_office_address.address_line_2));
          }
          if(sourceCompany.data.registered_office_address.region !== company.region){
            _log('[UPDATE COMPANY] Company region at source different from the one in IDM for company ' + company.number);
            patchItems.push(createPatchItem('region', sourceCompany.data.registered_office_address.region));
          }
          if(sourceCompany.data.date_of_creation !== company.creationDate){
            _log('[UPDATE COMPANY] Company creation date at source different from the one in IDM for company ' + company.number);
            patchItems.push(createPatchItem('creationDate', sourceCompany.data.date_of_creation));
          }
          if(mapCHSCompanyJurisdiction(sourceCompany.data.jurisdiction) !== company.jurisdiction){
            _log('[UPDATE COMPANY] Company jurisdiction at source different from the one in IDM for company ' + company.number);
            patchItems.push(createPatchItem('jurisdiction', mapCHSCompanyJurisdiction(sourceCompany.data.jurisdiction)));
          }
        } else {
          _log('Company data not found at source (CHS MongoDB) for company ' + company.name);
        }
          
        if(patchItems.length > 0){
          let updatedCompany = openidm.patch(
            'managed/' + OBJECT_COMPANY + '/' + company._id,
            null,
            patchItems
          );
          updatedCompanies.push(updatedCompany);
        }
      });
  
      return true;
    } catch (e) {
      _log('Error : ' + e);
      return false;
    }
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
        phone: fullUser.telephoneNumber ? fullUser.telephoneNumber : undefined,
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
          displayName: user.givenName ? user.givenName : user.userName,
          phone: user.telephoneNumber ? user.telephoneNumber : undefined,
        };
      }
    }
    return mappedUser;
  }
  
  //query 1: fetch all associated companies from current user
  var actor = getUserById(context.security.authenticationId);
  let sourceData;
  let outputCompanies = [];
  if (actor.memberOfOrg.length > 0) {
      
    //query 2: fetch full IDM data set for associated companies (this will get company number too)
    let fetchedCompanies = getCompanies(actor.memberOfOrg);

    //query 3/4: fetch source data set for associated companies (including auth codes) by company number
    _log('[ON-DEMAND SYNC] User ' + actor.userName + ' is member of ' + fetchedCompanies.length + ' companies!');
    const chunkSize = 100;
    let pageCount = 0;
    const res = [];
        
    for (let i = 0; i < fetchedCompanies.length; i += chunkSize) {
        let chunk = fetchedCompanies.slice(i, i + chunkSize);
        
        let companiesInPage = chunk.map(c => {return c.number});
        _log('[ON-DEMAND SYNC] processing page of results ' + pageCount++ + ' - ' + JSON.stringify(companiesInPage));
        sourceData = getCompaniesDataFromSource(chunk);
        
        //UPDATES: UPDATE companies in IDM if source data info is found
        if(sourceData.success){
          _log('[ON-DEMAND SYNC] Successfully looked up source company/auth code data from CHS/EWF');
          updateCompanyData(fetchedCompanies, sourceData);
        } else {
          _log('[ON-DEMAND SYNC] Error while looking up source company/auth code data from CHS/EWF - ' + sourceData.message);
        }
    }

    //query 5: fetch updated companies data
    fetchedCompanies = getCompanies(actor.memberOfOrg);
  
    //prepare response
    actor.memberOfOrg.forEach(company => {
      // let companyInfo = getCompany(company._ref);      
      const companyInfo = fetchedCompanies.find( fetchedCompany => { 
        return (fetchedCompany._id === company._refResourceId);
      });
        
      let mappedMembers = mapCompanyMembers(company._refResourceId, companyInfo.members);
      let inviter;
      let membershipStatus;
      
      if(company._refProperties){
        inviter = mapInviter(company._refProperties.inviterId);
        membershipStatus = company._refProperties.membershipStatus;
      }

      outputCompanies.push({
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
      });
    });
  }
  
  if (request.action === RequestAction.GET_USER_COMPANIES) {
    return outputCompanies;
  } else
  if (request.method === 'read') {
  
    let currentPage = request.additionalParameters.currentPage || Defaults.CURRENT_PAGE;
    let pageSize = request.additionalParameters.pageSize || Defaults.PAGE_SIZE;
    let maxPages = request.additionalParameters.maxPages || Defaults.MAX_PAGES;
    let searchTerm = request.additionalParameters.searchTerm;
    let statusParam = request.additionalParameters.status;
              
    // apply search term filter
    if (searchTerm) {
      outputCompanies = outputCompanies.filter(comp => {
        return (comp.name.toUpperCase().indexOf(searchTerm.toUpperCase()) > -1 || comp.number.toUpperCase().indexOf(searchTerm.toUpperCase()) > -1);
      });
    }
  
    // apply status filter
    if(statusParam){
  
      if(![StatusFilter.CONFIRMED, StatusFilter.PENDING].includes(statusParam)){
        throw {
          code: 400,
          message: 'Invalid value for status filter. Allowed values are [confirmed, pending]'
        };
      }
  
      outputCompanies = outputCompanies.filter(comp => {
        return (comp.membershipStatus === statusParam);
      });
    }
  
    let pagination = paginate(
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
})();
  