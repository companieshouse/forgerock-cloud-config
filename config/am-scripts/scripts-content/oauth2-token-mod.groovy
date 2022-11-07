/* groovylint-disable LineLength, NoDef, VariableTypeRequired */
/*
 * Copyright 2019 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

import org.forgerock.http.protocol.Request
import org.forgerock.http.protocol.Response

import com.iplanet.sso.SSOException

import groovy.json.JsonSlurper

/**
 * Defined variables:
 * accessToken - The access token to be updated. Mutable object, all changes to the access token will be reflected.
 * httpClient - always present, the HTTP client that can be used to make external HTTP requests
 * identity - always present, the identity of the resource owner
 * logger - always present, corresponding log files will be prefixed with: scripts.OAUTH2_ACCESS_TOKEN_MODIFICATION.
 * scopes - always present, the requested scopes
 * session - present if the request contains the session cookie, the user's session object
 *
 * No return value - changes shall be made to the accessToken parameter directly.
 *
 * The changes made to OAuth2 access tokens will directly impact the size of the CTS tokens, and similarly the size of
 * the JWTs if client based OAuth2 tokens are utilised.
 * When adding/updating fields make sure that the token size remains within client/user-agent limits.
 */

 def clientId = clientProperties.clientId
accessToken.setField("client-id", clientId)
logger.message('[CHSLOG][ATMS] ACCESS TOKEN MOD SCRIPT')
def claims = accessToken.getClaims()
if (claims == null) {
    logger.message('[CHSLOG] No claims in token')
} else {
    logger.message('[CHSLOG] Got claims ' + claims)
    def claimsObject = new JsonSlurper().parseText(claims)
    if (claimsObject == null) {
        logger.error('[CHSLOG] Could not decode claims to object')
    } else if (claimsObject.userinfo == null) {
        logger.error('[CHSLOG] No userInfo in claims')
    } else if (claimsObject.userinfo.company == null) {
        logger.error('[CHSLOG] No company in claims')
    } else if (claimsObject.userinfo.company.value == null) {
        logger.error('[CHSLOG] No company value in claims')
    } else {
        def company = claimsObject.userinfo.company.value
        logger.error('[CHSLOG] Got company ' + company)
        accessToken.setField('company', company)

        def attributes = identity.getAttributes(["fr-attr-istr1", "fr-attr-imulti2"].toSet())
        def companies = attributes["fr-attr-imulti2"]
        accessToken.setField("user-companies", companies)

        def isAssociated = isUserAssociated(companies, company)
        if (isAssociated) {
            accessToken.setField("company-associated", isAssoc)
        }

        def isInternalApp = false
        if (clientId == 'CHSInternalClient') {
            isInternalApp = true
        }
        accessToken.setField("internal-app", isInternalApp)

        // Test possible scopes
        // TODO Pass values in request

        // var scopes = ""
        //var scopes = "https://account.companieshouse.gov.uk/user/profile.read"
        var scopes = "https://identity.company-information.service.gov.uk/user/profile.read"
        // var scopes = "https://account.companieshouse.gov.uk/user.write-full"
        // var scopes = "https://identity.company-information.service.gov.uk/user.write-full"
        // var scopes = "https://api.companieshouse.gov.uk/company/registered-office-address.update"
        // var scopes = "https://api.company-information.service.gov.uk/company/registered-office-address.update"
        // var scopes = "https://api.companieshouse.gov.uk/company/admin.write-full"
        // var scopes = "https://api.company-information.service.gov.uk/company/admin.write-full"
        // var scopes = "http://api.companieshouse.gov.uk/company"
        // var scopes = "https://api.companieshouse.gov.uk/company"
        // var scopes = "https://account.companieshouse.gov.uk/user/profile.read https://account.companieshouse.gov.uk/user.write-full"
        // var scopes = "https://identity.company-information.service.gov.uk/user/profile.read https://identity.company-information.service.gov.uk/user.write-full"

        var permissions = scopesToPermissions(scopes, company, isInternalApp)

        accessToken.setField("token_permissions", permissions)
    }
}

/** 
 * Check if user is associated with the company number passed in.
 */
def isUserAssociated(companies, targetCompanyNumber) {
   isAssoc = false

   companies.eachWithIndex { assocCompany, index ->
        def companyDetails = assocCompany.tokenize("-");
        def companyName = companyDetails.get(0).trim()
        def companyNumber = companyDetails.get(1).trim()

        if (companyNumber.equals(targetCompanyNumber)) {
            accessToken.setField("company-match", assocCompany)
            isAssoc = true
        }
    }

    return isAssoc
}

/**
 * Convert scopes to their equivalent permissions.
 *
 * Port of Companies House ScopeMapper. See
 * https://github.com/companieshouse/account.ch.gov.uk/blob/361e0425b131068e4942c348f25458dffdc4308c/lib/AccountChGovUk/Helpers/ScopeMapper.pm
 *
 * Map Oauth2 scopes to permissions. Companies House APIs include scopes for restricting access to
 * API resources and operations (e.g.,/company/{company_number}/registered-office-address.update).
 *
 * These scopes are mapped to permission records which are stored in MongoDB (account.oauth2_authorisations).
 *
 * The permission records in turn are added to HTTP headers by ERIC and presented to Companies House
 * APIs with each request. The backend APIs are responsible for granting/denying access to the
 * requested resources and operations based on the permission HTTP headers.
 *
 * See the following documentation for the full list of Companies House scopes and permissions: https://companieshouse.atlassian.net/wiki/x/AQCPTw
 * Please update this document if you are updating the scopes or permissions in this module.
 *
 * The module purposefully uses a declarative mapping style between scopes and permissions to ensure the mapping stays simple and unambiguous.
 * The module is used by the account site to map scoped authorisation requests to permissions for storage in MongoDB
 * that are subsequently passed to APIs in HTTP headers via ERIC.
 *
 *
 * Get permissions record for one or more scope strings (space separated)
 */
def scopesToPermissions(incomingScopes, companyNumber, isInternalApp=false) {
    def legacyScopesAllowed = true

    def permissionRecord = [:]

    if (incomingScopes.length() == 0) {
        return permissionRecord
    }

    String[] scopes = incomingScopes.split(' ')
    for (scope in scopes) {
        def map = scopeToPermissions(scope, permissionRecord, companyNumber, isInternalApp, legacyScopesAllowed)
        addPermissions(permissionRecord, map)
    }

    // TODO Check for 'error' values in the resulting permissionRecord map.
    // If there's an error, return empty permissions?

    return permissionRecord
}

/**
 * Simple mapping between scopes and permissions.
 */
def scopeToPermissions(scope, permissionRecord, companyNumber, isInternalApp, legacyScopesAllowed) {
    // Handle literal scopes first
    if (scope.equals('https://account.companieshouse.gov.uk/user/profile.read') ||
        scope.equals('https://identity.company-information.service.gov.uk/user/profile.read')) {
        def map = [:]
        map['user_profile'] = 'read'
        return map
    } else if (scope.equals('https://api.companieshouse.gov.uk/company') ||
            scope.equals('http://api.companieshouse.gov.uk/company') ||
            scope.equals('http://api.companieshouse.gov.uk/company/' + companyNumber)) {
        if (legacyScopesAllowed) {
            // Grant permission here for legacy scopes - no new domain option for this one!
            if (isInternalApp) {
                def map = [:]
                map['company_accounts'] = 'update'
                map['company_auth_code'] = 'update,delete'
                map['company_number'] = companyNumber
                map['company_roa'] = 'update'
                map['company_status'] = 'update'
                map['company_transactions'] = 'read'
                map['company_promise_to_file'] = 'update'
                return map
            } else {
                def map = [:]
                map['error'] = 'Permission denied. External app requested legacy scope: admin.write-full for company number: ' + companyNumber
                return map
            }
        } else {
            def map = [:]
            map['error'] = 'Permission denied. Legacy scopes not allowed.'
            return map
        }
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/admin.write-full') ||
            scope.equals('https://api.company-information.service.gov.uk/company/admin.write-full')) {
        if (isInternalApp) {
            def map = [:]
            map['company_accounts'] = 'update'
            map['company_auth_code'] = 'update,delete'
            map['company_number'] = companyNumber
            map['company_roa'] = 'update'
            map['company_status'] = 'update'
            map['company_transactions'] = 'read'
            map['company_promise_to_file'] = 'update'
            return map
        } else {
            def map = [:]
            map['error'] = 'Permission denied. External app requested scope: admin.write-full for company number: ' + companyNumber
            return map
        }
    } else if (scope.equals('https://account.companieshouse.gov.uk/user.write-full') ||
            scope.equals('https://identity.company-information.service.gov.uk/user.write-full')) {
        if (isInternalApp) {
            def map = [:]
            map['user_applications'] = 'create,read,update,delete'
            map['user_profile'] = 'delete,read,update'
            map['user_following'] = 'read,update'
            map['user_transactions'] = 'read'
            map['user_request_auth_code'] = 'create'
            map['user_orders'] = 'read'
            map['user_secure_applications'] = 'create,read,update,delete'
            map['user_third_party_apps'] = 'read,delete'
            return map
        } else {
            def map = [:]
            map['error'] = 'Permission denied. External app requested forbidden scope: /user.write-full'
            return map
        }
    } else if (scope.equals('http://identity.company-information.service.gov.uk/user/profile.update')) {
        if (isInternalApp) {
            def map = [:]
            map['user_profile'] = 'read,update'
            return map
        } else {
            def map = [:]
            map['error'] = 'Permission denied. External app requested forbidden scope: /profile.update'
            return map
        }
    } else if (scope.equals('http://identity.company-information.service.gov.uk/user/profile.delete')) {
        if (isInternalApp) {
            def map = [:]
            map['user_profile'] = 'read,delete'
            return map
        } else {
            def map = [:]
            map['error'] = 'Permission denied. External app requested forbidden scope: /profile.delete'
            return map
        }
    } else if (scope.equals('http://identity.company-information.service.gov.uk/user/profile.write-full')) {
        if (isInternalApp) {
            def map = [:]
            map['user_profile'] = 'read,update,delete'
            return map
        } else {
            def map = [:]
            map['error'] = 'Permission denied. External app requested forbidden scope: /profile.write-full'
            return map
        }
    } else if (scope.equals('https://find-and-update.company-information.service.gov.uk/following.read')) {
        if (isInternalApp) {
            def map = [:]
            map['user_following'] = 'read'
            return map
        } else {
            def map = [:]
            map['error'] = 'Permission denied. External app requested forbidden scope: /following.read'
            return map
        }
    } else if (scope.equals('https://find-and-update.company-information.service.gov.uk/following.update')) {
        if (isInternalApp) {
            def map = [:]
            map['user_following'] = 'read,update'
            return map
        } else {
            def map = [:]
            map['error'] = 'Permission denied. External app requested forbidden scope: /following.update'
            return map
        }
    } else if (scope.equals('https://find-and-update.company-information.service.gov.uk/transactions.read')) {
        def map = [:]
        map['user_transactions'] = 'read'
        return map
    } else if (scope.equals('https://find-and-update.company-information.service.gov.uk/orders.read')) {
        if (isInternalApp) {
            def map = [:]
            map['user_orders'] = 'read'
            return map
        } else {
            def map = [:]
            map['error'] = 'Permission denied. External app requested forbidden scope: /orders.read'
            return map
        }
    } else if (scope.equals('https://identity.company-information.service.gov.uk/applications.create')) {
        if (isInternalApp) {
            def map = [:]
            map['user_applications'] = 'create'
            return map
        } else {
            def map = [:]
            map['error'] = 'Permission denied. External app requested forbidden scope: /applications.create'
            return map
        }
    } else if (scope.equals('https://identity.company-information.service.gov.uk/applications.read')) {
        if (isInternalApp) {
            def map = [:]
            map['user_applications'] = 'read'
            return map
        } else {
            def map = [:]
            map['error'] = 'Permission denied. External app requested forbidden scope: /applications.read'
            return map
        }
    } else if (scope.equals('https://identity.company-information.service.gov.uk/applications.update')) {
        if (isInternalApp) {
            def map = [:]
            map['user_applications'] = 'update'
            return map
        } else {
            def map = [:]
            map['error'] = 'Permission denied. External app requested forbidden scope: /applications.update'
            return map
        }
    } else if (scope.equals('https://identity.company-information.service.gov.uk/applications.delete')) {
        if (isInternalApp) {
            def map = [:]
            map['user_applications'] = 'delete'
            return map
        } else {
            def map = [:]
            map['error'] = 'Permission denied. External app requested forbidden scope: /applications.delete'
            return map
        }
    } else if (scope.equals('https://identity.company-information.service.gov.uk/applications.write-full')) {
        if (isInternalApp) {
            def map = [:]
            map['user_applications'] = 'create,read,update,delete'
            return map
        } else {
            def map = [:]
            map['error'] = 'Permission denied. External app requested forbidden scope: /applications.write-full'
            return map
        }
    } else if (scope.equals('https://identity.company-information.service.gov.uk/authentication-code.create')) {
        if (isInternalApp) {
            def map = [:]
            map['user_request_auth_code'] = 'create'
            return map
        } else {
            def map = [:]
            map['error'] = 'Permission denied. External app requested forbidden scope: /authentication-code.create'
            return map
        }
    } else if (scope.equals('https://account.companieshouse.gov.uk/user.write-full') ||
            scope.equals('https://identity.company-information.service.gov.uk/user.write-full')) {
        if (isInternalApp) {
            def map = [:]
            map['user_applications'] = 'create,read,update,delete'
            map['user_profile'] = 'create,read,update,delete'
            map['user_following'] = 'read,update'
            map['user_transactions'] = 'read'
            map['user_request_auth_code'] = 'create'
            map['user_orders'] = 'read'
            map['user_secure_applications'] = 'create,read,update,delete'
            map['user_third_party_apps'] = 'create,read,update,delete'
            return map
        } else {
            def map = [:]
            map['error'] = 'Permission denied. External app requested forbidden scope: /user.write-full'
            return map
        }
    } else if (scope.equals('https://api.companieshouse.gov.uk/company.create')) {
        def map = [:]
        map['company_incorporation'] = 'create'
        return map
    } else if (scope.equals('https://account.companieshouse.gov.uk/company/' + companyNumber + '/authentication-code.update')) {
        if (isInternalApp) {
            def map = [:]
            map['company_auth_code'] = 'update'
            return map
        } else {
            def map = [:]
            map['error'] = 'Permission denied. External app requested forbidden scope: /authentication-code.update'
            return map
        }
    } else if (scope.equals('https://account.companieshouse.gov.uk/company/' + companyNumber + '/authentication-code.delete')) {
        if (isInternalApp) {
            def map = [:]
            map['company_auth_code'] = 'delete'
            return map
        } else {
            def map = [:]
            map['error'] = 'Permission denied. External app requested forbidden scope: /authentication-code.delete'
            return map
        }
    } else if (scope.equals('https://account.companieshouse.gov.uk/company/' + companyNumber + '/authentication-code.write-full')) {
        if (isInternalApp) {
            def map = [:]
            map['company_auth_code'] = 'update,delete'
            return map
        } else {
            def map = [:]
            map['error'] = 'Permission denied. External app requested forbidden scope: /authentication-code.write-full'
            return map
        }
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/transactions')) {
        if (isInternalApp) {
            def map = [:]
            map['company_transactions'] = 'read'
            return map
        } else {
            def map = [:]
            map['error'] = 'Permission denied. External app requested forbidden scope: /transactions'
            return map
        }
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/registered-office-address.update')) {
        def map = [:]
        map['company_roa'] = 'update'
        return map
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/charges.create')) {
        def map = [:]
        map['company_charges'] = 'create'
        return map
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/charges.update')) {
        def map = [:]
        map['company_charges'] = 'update'
        return map
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/charges.write-full')) {
        def map = [:]
        map['company_charges'] = 'create,update'
        return map
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/*/charges.create')) {
        def map = [:]
        map['charges'] = 'create'
        return map
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/*/charges.update')) {
        def map = [:]
        map['charges'] = 'update'
        return map
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/*/charges.write-full')) {
        def map = [:]
        map['charges'] = 'create,update'
        return map
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/filing-history.update')) {
        if (isInternalApp) {
            def map = [:]
            map['company_filing_history'] = 'update'
            return map
        } else {
            def map = [:]
            map['error'] = 'Permission denied. External app requested forbidden scope: /filing-history.update'
            return map
        }
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/officers.create')) {
        def map = [:]
        map['company_officers'] = 'create'
        return map
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/officers.update')) {
        def map = [:]
        map['company_officers'] = 'update'
        return map
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/officers.write-full')) {
        def map = [:]
        map['company_officers'] = 'create,update'
        return map
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/officers.read-protected')) {
        if (isInternalApp) {
            def map = [:]
            map['company_officers'] = 'read-protected'
            return map
        } else {
            def map = [:]
            map['error'] = 'Permission denied. External app requested forbidden scope: /officers.read-protected'
            return map
        }
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/officers.read-secure')) {
        if (isInternalApp) {
            def map = [:]
            map['company_officers'] = 'read-secure'
            return map
        } else {
            def map = [:]
            map['error'] = 'Permission denied. External app requested forbidden scope: /officers.read-secure'
            return map
        }
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/officers.read-full')) {
        if (isInternalApp) {
            def map = [:]
            map['company_officers'] = 'read-protected,read-secure'
            return map
        } else {
            def map = [:]
            map['error'] = 'Permission denied. External app requested forbidden scope: /officers.read-full'
            return map
        }
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/registers.update')) {
        def map = [:]
        map['company_registers'] = 'update'
        return map
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/foreign-company-details.update')) {
        def map = [:]
        map['company_foreign_company_details'] = 'update'
        return map
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/branch-company-details.update')) {
        def map = [:]
        map['company_branch_company_details'] = 'update'
        return map
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/company-name.update')) {
        def map = [:]
        map['company_name'] = 'update'
        return map
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/company-type.update')) {
        def map = [:]
        map['company_type'] = 'update'
        return map
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/share-capital.update')) {
        def map = [:]
        map['company_share_capital'] = 'update'
        return map
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/confirmation-statement.update')) {
        def map = [:]
        map['company_confirmation_statement'] = 'update'
        return map
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/accounts.update')) {
        def map = [:]
        map['company_accounts'] = 'update'
        return map
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/constitution.update')) {
        def map = [:]
        map['company_constitution'] = 'update'
        return map
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/secretarial.write-full')) {
        def map = [:]
        map['company_roa'] = 'update'
        map['company_officers'] = 'create,update'
        map['company_pscs'] = 'create,update'
        map['company_psc_statements'] = 'create,update'
        return map
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/admin.write-full')) {
        if (isInternalApp) {
            def map = [:]
            map['company_number'] = companyNumber
            map['company_transactions'] = 'read'
            map['company_roa'] = 'update'
            map['company_charges'] = 'create,update'
            map['company_status'] = 'update'
            map['company_auth_code'] = 'update,delete'
            map['company_filing_history'] = 'update'
            map['company_officers'] = 'create,update,read-protected,read-secure'
            map['company_registers'] = 'update'
            map['company_foreign_company_details'] = 'update'
            map['company_branch_company_details'] = 'update'
            map['company_name'] = 'update'
            map['company_type'] = 'update'
            map['company_share_capital'] = 'update'
            map['company_confirmation_statement'] = 'update'
            map['company_accounts'] = 'update'
            map['company_constitution'] = 'update'
            map['company_pscs'] = 'create,update,read-protected,read-secure,read-super-secure'
            map['company_psc_statements'] = 'create,update'
            return map
        } else {
            def map = [:]
            map['error'] = 'Permission denied. External app requested forbidden scope: /admin.write-full'
            return map
        }
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/persons-with-significant-control.create')) {
        def map = [:]
        map['company_pscs'] = 'create'
        return map
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/persons-with-significant-control.update')) {
        def map = [:]
        map['company_pscs'] = 'update'
        return map
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/persons-with-significant-control.write-full')) {
        def map = [:]
        map['company_pscs'] = 'create,update'
        return map
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/persons-with-significant-control.read-protected')) {
        if (isInternalApp) {
            def map = [:]
            map['company_pscs'] = 'read-protected'
            return map
        } else {
            def map = [:]
            map['error'] = 'Permission denied. External app requested forbidden scope: /persons-with-significant-control.read-protected'
            return map
        }
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/persons-with-significant-control.read-secure')) {
        if (isInternalApp) {
            def map = [:]
            map['company_pscs'] = 'read-secure'
            return map
        } else {
            def map = [:]
            map['error'] = 'Permission denied. External app requested forbidden scope: /persons-with-significant-control.read-secure'
            return map
        }
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/persons-with-significant-control.read-super-secure')) {
        if (isInternalApp) {
            def map = [:]
            map['company_pscs'] = 'read-super-secure'
            return map
        } else {
            def map = [:]
            map['error'] = 'Permission denied. External app requested forbidden scope: /persons-with-significant-control.read-super-secure'
            return map
        }
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/persons-with-significant-control.read-full')) {
        if (isInternalApp) {
            def map = [:]
            map['company_pscs'] = 'read-protected,read-secure,read-super-secure'
            return map
        } else {
            def map = [:]
            map['error'] = 'Permission denied. External app requested forbidden scope: /persons-with-significant-control.read-full'
            return map
        }
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/persons-with-significant-control-statements.create')) {
        def map = [:]
        map['company_psc_statements'] = 'create'
        return map
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/persons-with-significant-control-statements.update')) {
        def map = [:]
        map['company_psc_statements'] = 'update'
        return map
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/persons-with-significant-control-statements.write-full')) {
        def map = [:]
        map['company_psc_statements'] = 'create,update'
        return map
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/registered-office-address.update') ||
        scope.equals('https://api.company-information.service.gov.uk/company/registered-office-address.update')) {
        def map = [:]
        map['company_number'] = companyNumber
        map['company_roa'] = 'update'
        return map
    } else {

        //do dynamic value cases (having to use string manipulation and FR won't currently allow use of regex classes)

        // Scope = 'https://api.companieshouse.gov.uk/company/' + companyType + '.create'
        if (scope.startsWith('https://api.companieshouse.gov.uk/company/') && scope.endsWith('.create')) {
            var companySplitScope = scope.split('https://api.companieshouse.gov.uk/company/')
            var companyType = companySplitScope[1].split('.create')
            def map = [:]
            logger.message('[CHSLOG] CompanyType = ' + companyType[0])
            map['company_incorporation'] = companyType[0] + ':create'
            return map
        }

        if (scope.contains("/officers/")) {
            var officersSplit = scope.split('/officers/')
            if (officersSplit[1].endsWith('.update')) { // 'https://api.companieshouse.gov.uk/company/' + companyNumber + '/officers/' + officerType + '/' + officerId + '.update'
                var officerIdSplit = officersSplit[1].split('/')
                var officerId = officerIdSplit[1].split('.update')[0]
                def map = [:]
                map['company_officers'] = officerId + ':update'
                return map
            }
            else if (officersSplit[1].endsWith('.read-full')) { // 'https://api.companieshouse.gov.uk/company/' + companyNumber + '/officers/' + officerType + '/' + officerId + '.read-full'
                if (isInternalApp) {
                    var officerIdSplit = officersSplit[1].split('/')
                    var officerId = officerIdSplit[1].split('.read-full')[0]
                    def map = [:]
                    map['company_officers'] = officerId + ':read-full'
                    return map
                } else {
                    def map = [:]
                    map['error'] = 'Permission denied. External app requested forbidden scope: /' + officerId + '.read-full'
                    return map
                }
            }
        }

        if (scope.contains("/registers/") && scope.contains(".update")) { // 'https://api.companieshouse.gov.uk/company/' + companyNumber + '/registers/' + registerType + '.update'
            var registersSplit = scope.split("/registers/")
            var registerTypeSplit = registersSplit[1].split('.update')
            var registerType = registerTypeSplit[0]

            def map = [:]
            map['company_registers'] = registerType + ':update'
            return map
        }

        if (scope.contains("/persons-with-significant-control/")) {
            if (scope.contains(".update")) { // 'https://api.companieshouse.gov.uk/company/' + companyNumber + '/persons-with-significant-control/' + pscType + '/' + pscId + '.update'
                var significantControlSplit = scope.split("/persons-with-significant-control/")
                var pscSlashSplit = significantControlSplit[1].split('/')
                var pscId = pscSlashSplit[1].split('.update')[0]
                def map = [:]
                map['company_pscs'] = pscId + ':update'
                return map
            }
            else if (scope.contains(".read-full")) { // 'https://api.companieshouse.gov.uk/company/' + companyNumber + '/persons-with-significant-control/' + pscType + '/' + pscId + '.read-full'
                if (isInternalApp) {
                    var significantControlSplit = scope.split("/persons-with-significant-control/")
                    var pscSlashSplit = significantControlSplit[1].split('/')
                    var pscId = pscSlashSplit[1].split('.read-full')[0]
                    def map = [:]
                    map['company_pscs'] = pscId + ':read-full'
                    return map
                } else {
                    def map = [:]
                    map['error'] = 'Permission denied. External app requested forbidden scope: /' + pscId + '.read-full'
                    return map
                }
            }
        }

        if (scope.contains("/charges/") && scope.contains(".update")) { // 'https://api.companieshouse.gov.uk/company/' + companyNumber + '/charges/' + chargeId + '.update'
            var chargesSplit = scope.split("/charges/")
            var chargeIdSplit = chargesSplit[1].split('.update')
            var chargeId = chargeIdSplit[0]

            def map = [:]
            map['company_charges'] = chargeId + ':update'
            return map
        }

        def map = [:]
        map['error'] = 'No permissions found matching the scope: ' + scope + '. Please add a new scope to the token modification script'
        return map
    }
}

def addPermissions(permissionRecord, permissions) {
    permissions.each { key, value ->
        value = value.trim()

        if (!permissionRecord.containsKey(key)) {
            permissionRecord.put(key, value)
        } else {
            def existingValue = permissionRecord.get(key)

            // Merge new permission values into one string delimited by ','
            var allValues  = [value, existingValue].join(',')
            def uniqueValues = allValues.split(',').collect()
            uniqueValues = uniqueValues.unique()

            // Store the merged permissions list
            permissionRecord.put(key, uniqueValues.join(','))
        }
    }
}

/*
//Field to always include in token
accessToken.setField("hello", "world")

//Obtain additional values by performing a REST call to an external service
try {
    Response response = httpClient.send(new Request()
            .setUri("https://third.party.app/hello.jsp")
            .setMethod("POST")
            .modifyHeaders({ headers -> headers.put("Content-Type", "application/json;charset=UTF-8") })
            //          .setEntity('foo=bar&hello=world'))
            .setEntity([foo: 'bar']))
            .getOrThrow()
    if (response.status.successful) {
        def result = new JsonSlurper().parseText(response.entity.string)
        accessToken.setFields(result.get("updatedFields"))
    } else {
        logger.error("Unable to obtain access token modifications: {}, {}", response.status, response.entity.toString())
    }
} catch (InterruptedException ex) {
    logger.error("The request processing was interrupted", ex)
    Thread.currentThread().interrupt()
    //The access token request will fail with HTTP 500 error in this case.
    throw new RuntimeException("Unable to obtain response from ")
}

//Add new fields containing identity attribute values
def attributes = identity.getAttributes(["mail", "telephoneNumber"].toSet())
accessToken.setField("mail", attributes["mail"])
accessToken.setField("phone", attributes["telephoneNumber"])

//Add new fields containing session property values
if (session != null) { // session is not available for resource owner password credentials grant
    try {
        accessToken.setField("ipAddress", session.getProperty("Host"))
    } catch (SSOException ex) {
        logger.error("Unable to retrieve session property value", ex)
    }
}

// Remove a native field from the token entry, that was set by AM. For complete list of remove* methods see the JavaDoc
// for org.forgerock.oauth2.core.AccessToken class.
accessToken.removeTokenName()
*/
