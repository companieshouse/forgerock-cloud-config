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
    } else if (claimsObject.userInfo == null) {
        logger.error('[CHSLOG] No userInfo in claims')
    } else if (claimsObject.userInfo.company == null) {
        logger.error('[CHSLOG] No company in claims')
    } else if (claimsObject.userInfo.company.value == null) {
        logger.error('[CHSLOG] No company value in claims')
    } else {
        def company = claimsObject.userInfo.company.value
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
        var scopes = "https://account.companieshouse.gov.uk/user/profile.read"
        // var scopes = "https://identity.company-information.service.gov.uk/user/profile.read"
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
    } else if (scope.equals('https://account.companieshouse.gov.uk/user.write-full') ||
            scope.equals('https://identity.company-information.service.gov.uk/user.write-full')) {
        if (isInternalApp) {
            def map = [:]
            map['user_applications'] = 'create,read,update,delete'
            map['user_profile'] = 'delete,read,update'
            map['user_following'] = 'read,update'
            map['user_transactions'] = 'read'
            map['user_request_auth_code'] = 'create'
            map['user_orders'] = 'create,read,update,delete'
            map['user_secure_applications'] = 'create,read,update,delete'
            map['user_third_party_apps'] = 'read,delete'
            return map
        } else {
            def map = [:]
            map['error'] = 'Permission denied. External app requested forbidden scope: /user.write-full'
            return map
        }
    } else if (scope.equals('https://api.companieshouse.gov.uk/company/registered-office-address.update') ||
            scope.equals('https://api.company-information.service.gov.uk/company/registered-office-address.update')) {
        def map = [:]
        map['company_number'] = companyNumber
        map['company_roa'] = 'update'
        return map
    } else if (scope.equals('https://api.companieshouse.gov.uk/company') ||
            scope.equals('http://api.companieshouse.gov.uk/company')) {
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
    } else {
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
