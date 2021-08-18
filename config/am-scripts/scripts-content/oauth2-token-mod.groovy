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

def claims = accessToken.getClaims()
if (claims == null) {
    logger.message('No claims in token')
} else {
    logger.message('Got claims ' + claims)
    def claimsObject = new JsonSlurper().parseText(claims)
    if (claimsObject == null) {
        logger.error('Could not decode claims to object')
  } else if (claimsObject.userInfo == null) {
        logger.error('No userInfo in claims')
  } else if (claimsObject.userInfo.company == null) {
        logger.error('No company in claims')
  } else if (claimsObject.userInfo.company.value == null) {
        logger.error('No company value in claims')
  } else {
        def company = claimsObject.userInfo.company.value
        logger.error('Got company ' + company)
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

        // Quick test
        // var scopes = "https://account.companieshouse.gov.uk/user/profile.read https://account.companieshouse.gov.uk/user.write-full"
        // var scopes = "https://api.companieshouse.gov.uk/company/registered-office-address.update"
        var scopes = "https://api.companieshouse.gov.uk/company"
        // var test = scopesToPermissions(scopes, company, isInternalApp)
        var test = scopesToPermissions(scopes, company, true)
        accessToken.setField("token-permissions", test)
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
            // println('External app requested forbidden scope: /user.write-full')
            // permissions.invalidate('Permission denied.')
            // return permissions
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
    }  else if (scope.equals('https://api.companieshouse.gov.uk/company')) {
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
                // println("Permission denied. External app requested legacy scope: admin.write-full for company number: $companyNumber")
                // permissions.invalidate('Permission denied.')
                // return permissions
                def map = [:]
                map['error'] = 'Permission denied. External app requested legacy scope: admin.write-full for company number: ' + companyNumber
                return map
            }
        } else {
            // println('Permission denied. Legacy scopes not allowed.')
            // permissions.invalidate('Permission denied.')
            // return permissions
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
            // println('Permission denied. External app requested scope: admin.write-full for company number: ' + companyNumber)
            // permissions.invalidate('Permission denied.')
            // return permissions
            def map = [:]
            map['error'] = 'Permission denied. External app requested scope: admin.write-full for company number: ' + companyNumber
            return map
        }
    } else {
        // println('No permissions found matching the scope: ' + scope + '. Please add a new scope to the module: AccountChGovUk::Helpers::ScopeMapper->scope_to_permissions().')
        // permissions.invalidate('No permissions found matching the scope: ' + scope)
        // return permissions
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

///////////////////////////////////////////////////////////////////////////////

//                   COMPANIES HOUSE SCOPE MAPPER

///////////////////////////////////////////////////////////////////////////////
/**
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
 *
 * chPermissions = scopeMapper.scopesToPermissions('https://somesite.com/requested-scope')
 *
 * if (chPermissionsOut.isValid()) {
 *     //return a record (possibly merged) of the permissions
 *     permissions = $permissions.getPermissions;
 * }
 * else {
 *     // handle any errors
 *     errors = chPermissionsOut.getInvalidErrors()
 * }

 * Pass the scope(s) and optionally the company name to render a list of human-readable permission text strings
 * permissionText = scopeMapper.scopesToPermissionText('https://somesite.com/requested-scope', 'Girls Day Trust');
 *
 */
class ScopeMapper {

    // Allow deprecated scopes (e.g., http://api.companieshouse.gov.uk/company/{company_number})
    // Once code is migrated remove this flag or default to 0
    def legacyScopesAllowed = true

    void setLegacyScopesAllowed(isAllowed) {
        legacyScopesAllowed = isAllowed
    }

    def scopesToPermissionText(incomingScopes, companyName) {
        def permissions = []

        String[] scopes = incomingScopes.split(' ')
        for (scope in scopes) {
            // Provide human readable text for a given singular scope string.
            // This text appears on the 3rd-party authorisation prompt
            if (scope == ('https://account.companieshouse.gov.uk/user/profile.read') ||
                    scope == ('https://identity.company-information.service.gov.uk/user/profile.read')) {
                permissions.push('This will allow it to view your email address.')
            } else if (scope =~ 'https://api.companieshouse.gov.uk/company/(.*?)/registered-office-address.update' ||
                    scope =~ 'https://api.company-information.service.gov.uk/company/(.*?)/registered-office-address.update') {
                permissions.push('This will allow it to update ' + companyName + '\'s registered office address.')
            } else {
                // No scope permission text found
                println('No scope permission text found for scope: ' + scope + '. Please add a scope permission text.')
                permissions.push(scope)
            }
        }

        // return permissions;
        return permissions.reverse()
    }

    def scopesToPermissionForUserWebIdentity(incomingScopes, companyNumber=null) {
        def scopesAsText = []

        boolean companyNumberSupplied = companyNumber?.trim()

        String[] scopes = incomingScopes.split(' ')
        for (scope in scopes) {
            // Provide human readable text for a given singular scope string.
            // This text appears on the 3rd party authorisation prompt
            if (scope.equals('https://account.companieshouse.gov.uk/user/profile.read') ||
                    scope.equals('https://identity.company-information.service.gov.uk/user/profile.read')) {
                scopesAsText.push('View email address')
            } else if (companyNumberSupplied &&
                    (scope.equals('https://api.companieshouse.gov.uk/company/' + companyNumber + '/registered-office-address.update') ||
                            scope.equals('https://api.company-information.service.gov.uk/company/' + companyNumber + '/registered-office-address.update') ) ) {
                scopesAsText.push('Update registered office address')
                // Finally, append company company_number - if supplied
                if (companyNumberSupplied) {
                    // TODO Check this output
                    scopesAsText.push('for {{' + companyNumber + '}} (' + companyNumber + ')')
                }
            } else {
                // No scope permission text found
                println('No scope permission text found for scope: ' + scope + '. Please add a scope permission text.')
            }
        }

        return scopesAsText.reverse().join(' ')
    }

    /**
     * Convert scopes to their equivalent permissions.
     */
    def scopesToPermissions(incomingScopes, isForInternalApp=false) {
        def chPermissions = new CHPermissions()
        chPermissions.isForInternalApp(isForInternalApp)

        if (incomingScopes.length() == 0) {
            return chPermissions
        }

        String[] scopes = incomingScopes.split(' ')
        for (scope in scopes) {
            scopeToPermissions(scope, chPermissions)
        }

        return chPermissions
    }

    /**
     * Simple mapping between literal and placeholder scopes and permissions.
     */
    def scopeToPermissions(scope, permissions) {
        // Handle literal scopes first
        if (scope.equals('https://account.companieshouse.gov.uk/user/profile.read') ||
                scope.equals('https://identity.company-information.service.gov.uk/user/profile.read')) {
            def map = [:]
            map['user_profile'] = 'read'

            permissions.addPermissions(map)
            return permissions
        } else if (scope.equals('https://account.companieshouse.gov.uk/user.write-full') ||
                scope.equals('https://identity.company-information.service.gov.uk/user.write-full')) {
            if (permissions.isForInternalApp()) {
                def map = [:]
                map['user_applications'] = 'create,read,update,delete'
                map['user_profile'] = 'delete,read,update'
                map['user_following'] = 'read,update'
                map['user_transactions'] = 'read'
                map['user_request_auth_code'] = 'create'
                map['user_orders'] = 'create,read,update,delete'
                map['user_secure_applications'] = 'create,read,update,delete'
                map['user_third_party_apps'] = 'read,delete'

                permissions.addPermissions(map)
                return permissions
            } else {
                println('External app requested forbidden scope: /user.write-full')
                permissions.invalidate('Permission denied.')
                return permissions
            }
        } else if (scope =~ 'https://api.companieshouse.gov.uk/company/(.*?)/registered-office-address.update' ||
                scope =~ 'https://api.company-information.service.gov.uk/company/(.*?)/registered-office-address.update') {
            def result = (scope =~ '/company/(.*?)/registered-office-address.update').findAll()
            def companyNumber = result[0][1]

            def map = [:]
            map['company_number'] = companyNumber
            map['company_roa'] = 'update'

            permissions.addPermissions(map)
            return permissions
        } else if (scope =~ 'https?://api.companieshouse.gov.uk/company/(\\w+)$' ) {
            if (legacyScopesAllowed) {
                // Grant permission here for legacy scopes - no new domain option for this one!
                def result = (scope =~ 'https?://api.companieshouse.gov.uk/company/(\\w+)$').findAll()
                def companyNumber = result[0][1]

                if (permissions.isForInternalApp()) {
                    def map = [:]
                    map['company_accounts'] = 'update'
                    map['company_auth_code'] = 'update,delete'
                    map['company_number'] = companyNumber
                    map['company_roa'] = 'update'
                    map['company_status'] = 'update'
                    map['company_transactions'] = 'read'
                    map['company_promise_to_file'] = 'update'

                    permissions.addPermissions(map)
                    return permissions
                } else {
                    println("Permission denied. External app requested legacy scope: admin.write-full for company number: $companyNumber")
                    permissions.invalidate('Permission denied.')
                    return permissions
                }
            } else {
                println('Permission denied. Legacy scopes not allowed.')
                permissions.invalidate('Permission denied.')
                return permissions
            }
        } else if (scope =~ 'https://api.companieshouse.gov.uk/company/(.*?)/admin.write-full' ||
                scope =~ 'https://api.company-information.service.gov.uk/company/(.*?)/admin.write-full') {
            def result = (scope =~ '/company/(.*?)/admin.write-full').findAll()
            def companyNumber = result[0][1]

            if (permissions.isForInternalApp()) {
                def map = [:]
                map['company_accounts'] = 'update'
                map['company_auth_code'] = 'update,delete'
                map['company_number'] = companyNumber
                map['company_roa'] = 'update'
                map['company_status'] = 'update'
                map['company_transactions'] = 'read'
                map['company_promise_to_file'] = 'update'

                permissions.addPermissions(map)
                return permissions
            } else {
                println('Permission denied. External app requested scope: admin.write-full for company number: ' + companyNumber)
                permissions.invalidate('Permission denied.')
                return permissions
            }
        } else {
            println('No permissions found matching the scope: ' + scope + '. Please add a new scope to the module: AccountChGovUk::Helpers::ScopeMapper->scope_to_permissions().')
            permissions.invalidate('No permissions found matching the scope: ' + scope)
            return permissions
        }
    }

}

class CHPermissions {

    boolean isForInternalApp = false

    def invalidErrors = []

    def permissionRecord = [:]

    void addPermissions(permissions) {
        permissions.each { key, value ->
            value = value.trim()

            if (!permissionRecord.containsKey(key)) {
                permissionRecord.put(key, value)
            } else {
                def existingValue = permissionRecord.get(key)

                // Check that the company_number matches any previous company_number
                if ( key.equals('company_number') && value != existingValue ) {
                    println('Permission denied. Mismatched company numbers in scope requests.')
                    invalidate('Permission denied. Mismatched company numbers in scope requests')
                }

                // Merge new permission values into one string delimited by ','
                var allValues  = [value, existingValue].join(',')
                def uniqueValues = allValues.split(',').collect()
                uniqueValues = uniqueValues.unique()

                // Store the merged permissions list
                permissionRecord.put(key, uniqueValues.join(','))
            }
        }
    }

    Map getPermissions() {
        // Return an empty set unless the permissions are valid
        if (this.isValid()) {
            return permissionRecord
        }

        return [:]
    }

    boolean isForInternalApp() {
        return isForInternalApp
    }

    void isForInternalApp(internal) {
        isForInternalApp = internal
    }

    void invalidate(reason) {
        invalidErrors.add(reason)
    }

    List getInvalidErrors() {
        return invalidErrors
    }

    boolean isValid() {
        if (invalidErrors.size() == 0) {
            return true
        }

        return false
    }

}

// Test the ScopeMapper
//
// See https://github.com/companieshouse/account.ch.gov.uk/blob/361e0425b131068e4942c348f25458dffdc4308c/t/unit/Helpers/ScopeMapper.t#L445
// for equivalent tests of the original Perl module

// def scopeMapper = new ScopeMapper()

// def output = scopeMapper.scopesToPermissions("")
// assert output.isValid() == true
// permissions = output.getPermissions()
// assert permissions.size() == 0
// errors = output.getInvalidErrors()
// assert errors.size() == 0

// chPermissionsOut = scopeMapper.scopesToPermissions("https://account.companieshouse.gov.uk/user/profile.read", false)
// permissions = chPermissionsOut.getPermissions()
// assert permissions.size() == 1
// assert permissions.user_profile == 'read'

// chPermissionsOut = scopeMapper.scopesToPermissions("https://identity.company-information.service.gov.uk/user/profile.read", false)
// permissions = chPermissionsOut.getPermissions()
// assert permissions.size() == 1
// assert permissions.user_profile == 'read'

// chPermissionsOut = scopeMapper.scopesToPermissions("https://account.companieshouse.gov.uk/user.write-full", true)
// permissions = chPermissionsOut.getPermissions()
// assert permissions.size() == 8
// assert permissions.user_applications == 'create,read,update,delete'
// assert permissions.user_profile == 'delete,read,update'
// assert permissions.user_following == 'read,update'
// assert permissions.user_transactions == 'read'
// assert permissions.user_request_auth_code == 'create'
// assert permissions.user_orders == 'create,read,update,delete'
// assert permissions.user_secure_applications == 'create,read,update,delete'
// assert permissions.user_third_party_apps == 'read,delete'

// chPermissionsOut = scopeMapper.scopesToPermissions("https://identity.company-information.service.gov.uk/user.write-full", true)
// permissions = chPermissionsOut.getPermissions()
// assert permissions.size() == 8
// assert permissions.user_applications == 'create,read,update,delete'
// assert permissions.user_profile == 'delete,read,update'
// assert permissions.user_following == 'read,update'
// assert permissions.user_transactions == 'read'
// assert permissions.user_request_auth_code == 'create'
// assert permissions.user_orders == 'create,read,update,delete'
// assert permissions.user_secure_applications == 'create,read,update,delete'
// assert permissions.user_third_party_apps == 'read,delete'

// chPermissionsOut = scopeMapper.scopesToPermissions("https://account.companieshouse.gov.uk/user.write-full", false)
// permissions = chPermissionsOut.getPermissions()
// assert permissions.size() == 0
// assert chPermissionsOut.isValid() == false
// errors = chPermissionsOut.getInvalidErrors()
// assert errors.size() == 1
// assert errors[0] == 'Permission denied.'

// chPermissionsOut = scopeMapper.scopesToPermissions("https://identity.company-information.service.gov.uk/user.write-full", false)
// permissions = chPermissionsOut.getPermissions()
// assert permissions.size() == 0
// assert chPermissionsOut.isValid() == false
// errors = chPermissionsOut.getInvalidErrors()
// assert errors.size() == 1
// assert errors[0] == 'Permission denied.'

// chPermissionsOut = scopeMapper.scopesToPermissions("https://api.companieshouse.gov.uk/company/00006400/registered-office-address.update")
// permissions = chPermissionsOut.getPermissions()
// assert permissions.size() == 2
// assert permissions.company_number == '00006400'
// assert permissions.company_roa == 'update'

// chPermissionsOut = scopeMapper.scopesToPermissions("https://api.company-information.service.gov.uk/company/00006400/registered-office-address.update")
// permissions = chPermissionsOut.getPermissions()
// assert permissions.size() == 2
// assert permissions.company_number == '00006400'
// assert permissions.company_roa == 'update'

// chPermissionsOut = scopeMapper.scopesToPermissions("https://api.companieshouse.gov.uk/company/00006400/admin.write-full", false)
// permissions = chPermissionsOut.getPermissions()
// assert permissions.size() == 0
// assert chPermissionsOut.isValid() == false
// errors = chPermissionsOut.getInvalidErrors()
// assert errors.size() == 1
// assert errors[0] == 'Permission denied.'

// chPermissionsOut = scopeMapper.scopesToPermissions("https://api.company-information.service.gov.uk/company/00006400/admin.write-full", false)
// permissions = chPermissionsOut.getPermissions()
// assert permissions.size() == 0
// assert chPermissionsOut.isValid() == false
// errors = chPermissionsOut.getInvalidErrors()
// assert errors.size() == 1
// assert errors[0] == 'Permission denied.'

// chPermissionsOut = scopeMapper.scopesToPermissions("https://api.companieshouse.gov.uk/company/00006400/admin.write-full", true)
// permissions = chPermissionsOut.getPermissions()
// assert permissions.size() == 7
// assert permissions.company_accounts == 'update'
// assert permissions.company_auth_code == 'update,delete'
// assert permissions.company_number == '00006400'
// assert permissions.company_roa == 'update'
// assert permissions.company_status == 'update'
// assert permissions.company_transactions == 'read'
// assert permissions.company_promise_to_file == 'update'

// chPermissionsOut = scopeMapper.scopesToPermissions("https://api.company-information.service.gov.uk/company/00006400/admin.write-full", true)
// permissions = chPermissionsOut.getPermissions()
// assert permissions.size() == 7
// assert permissions.company_accounts == 'update'
// assert permissions.company_auth_code == 'update,delete'
// assert permissions.company_number == '00006400'
// assert permissions.company_roa == 'update'
// assert permissions.company_status == 'update'
// assert permissions.company_transactions == 'read'
// assert permissions.company_promise_to_file == 'update'

// chPermissionsOut = scopeMapper.scopesToPermissions("http://api.companieshouse.gov.uk/company/00006400", true)
// permissions = chPermissionsOut.getPermissions()
// assert permissions.size() == 7
// assert permissions.company_accounts == 'update'
// assert permissions.company_auth_code == 'update,delete'
// assert permissions.company_number == '00006400'
// assert permissions.company_roa == 'update'
// assert permissions.company_status == 'update'
// assert permissions.company_transactions == 'read'
// assert permissions.company_promise_to_file == 'update'

// chPermissionsOut = scopeMapper.scopesToPermissions("https://api.companieshouse.gov.uk/company/00006400", true)
// permissions = chPermissionsOut.getPermissions()
// assert permissions.size() == 7
// assert permissions.company_accounts == 'update'
// assert permissions.company_auth_code == 'update,delete'
// assert permissions.company_number == '00006400'
// assert permissions.company_roa == 'update'
// assert permissions.company_status == 'update'
// assert permissions.company_transactions == 'read'
// assert permissions.company_promise_to_file == 'update'

// chPermissionsOut = scopeMapper.scopesToPermissions("http://api.companieshouse.gov.uk/company/00006400", false)
// permissions = chPermissionsOut.getPermissions()
// assert permissions.size() == 0
// assert chPermissionsOut.isValid() == false
// errors = chPermissionsOut.getInvalidErrors()
// assert errors.size() == 1
// assert errors[0] == 'Permission denied.'

// scopeMapper.setLegacyScopesAllowed(false)
// chPermissionsOut = scopeMapper.scopesToPermissions("http://api.companieshouse.gov.uk/company/00006400", false)
// permissions = chPermissionsOut.getPermissions()
// assert permissions.size() == 0
// assert chPermissionsOut.isValid() == false
// errors = chPermissionsOut.getInvalidErrors()
// assert errors.size() == 1
// assert errors[0] == 'Permission denied.'

// scopeMapper.setLegacyScopesAllowed(true)
// chPermissionsOut = scopeMapper.scopesToPermissions("https://api.companieshouse.gov.uk/company/00006400/admin.write-full", false)
// permissions = chPermissionsOut.getPermissions()
// assert permissions.size() == 0
// assert chPermissionsOut.isValid() == false
// errors = chPermissionsOut.getInvalidErrors()
// assert errors.size() == 1
// assert errors[0] == 'Permission denied.'

// scopeMapper.setLegacyScopesAllowed(true)
// chPermissionsOut = scopeMapper.scopesToPermissions("https://api.company-information.service.gov.uk/company/00006400/admin.write-full", false)
// permissions = chPermissionsOut.getPermissions()
// assert permissions.size() == 0
// assert chPermissionsOut.isValid() == false
// errors = chPermissionsOut.getInvalidErrors()
// assert errors.size() == 1
// assert errors[0] == 'Permission denied.'

// scopeMapper.setLegacyScopesAllowed(true)
// chPermissionsOut = scopeMapper.scopesToPermissions("https://account.companieshouse.gov.uk/user/profile.read https://account.companieshouse.gov.uk/user.write-full", true)
// permissions = chPermissionsOut.getPermissions()
// assert permissions.size() == 8
// assert chPermissionsOut.isValid() == true
// assert permissions.user_applications == 'create,read,update,delete'
// assert permissions.user_profile == 'delete,read,update'
// assert permissions.user_following == 'read,update'
// assert permissions.user_transactions == 'read'
// assert permissions.user_request_auth_code == 'create'
// assert permissions.user_orders == 'create,read,update,delete'
// assert permissions.user_secure_applications == 'create,read,update,delete'
// assert permissions.user_third_party_apps == 'read,delete'

// scopeMapper.setLegacyScopesAllowed(true)
// chPermissionsOut = scopeMapper.scopesToPermissions("https://identity.company-information.service.gov.uk/user/profile.read https://identity.company-information.service.gov.uk/user.write-full", true)
// permissions = chPermissionsOut.getPermissions()
// assert permissions.size() == 8
// assert chPermissionsOut.isValid() == true
// assert permissions.user_applications == 'create,read,update,delete'
// assert permissions.user_profile == 'delete,read,update'
// assert permissions.user_following == 'read,update'
// assert permissions.user_transactions == 'read'
// assert permissions.user_request_auth_code == 'create'
// assert permissions.user_orders == 'create,read,update,delete'
// assert permissions.user_secure_applications == 'create,read,update,delete'
// assert permissions.user_third_party_apps == 'read,delete'

// scopeMapper.setLegacyScopesAllowed(true)
// chPermissionsOut = scopeMapper.scopesToPermissions("https://api.companieshouse.gov.uk/company/00006400/registered-office-address.update https://api.companieshouse.gov.uk/company/00007777/registered-office-address.update", false)
// permissions = chPermissionsOut.getPermissions()
// assert permissions.size() == 0
// assert chPermissionsOut.isValid() == false
// errors = chPermissionsOut.getInvalidErrors()
// assert errors.size() == 1
// assert errors[0] == 'Permission denied. Mismatched company numbers in scope requests'

// scopeMapper.setLegacyScopesAllowed(true)
// chPermissionsOut = scopeMapper.scopesToPermissions("https://api.company-information.service.gov.uk/company/00006400/registered-office-address.update https://api.company-information.service.gov.uk/company/00007777/registered-office-address.update", false)
// permissions = chPermissionsOut.getPermissions()
// assert permissions.size() == 0
// assert chPermissionsOut.isValid() == false
// errors = chPermissionsOut.getInvalidErrors()
// assert errors.size() == 1
// assert errors[0] == 'Permission denied. Mismatched company numbers in scope requests'

// scopeMapper.setLegacyScopesAllowed(true)
// chPermissionsOut = scopeMapper.scopesToPermissions("https://api.companieshouse.gov.uk/company/00006400/admin.write-full", false)
// permissions = chPermissionsOut.getPermissions()
// assert permissions.size() == 0
// assert chPermissionsOut.isValid() == false
// errors = chPermissionsOut.getInvalidErrors()
// assert errors.size() == 1
// assert errors[0] == 'Permission denied.'

// scopeMapper.setLegacyScopesAllowed(true)
// chPermissionsOut = scopeMapper.scopesToPermissions("'https://api.company-information.service.gov.uk/company/00006400/admin.write-full", false)
// permissions = chPermissionsOut.getPermissions()
// assert permissions.size() == 0
// assert chPermissionsOut.isValid() == false
// errors = chPermissionsOut.getInvalidErrors()
// assert errors.size() == 1
// assert errors[0] == 'Permission denied.'

// scopeMapper.setLegacyScopesAllowed(true)
// chPermissionsOut = scopeMapper.scopesToPermissions("https://account.companieshouse.gov.uk/user.write-full", true)
// permissions = chPermissionsOut.getPermissions()
// assert permissions.size() == 8
// assert chPermissionsOut.isValid() == true
// assert permissions.user_applications == 'create,read,update,delete'
// assert permissions.user_profile == 'delete,read,update'
// assert permissions.user_following == 'read,update'
// assert permissions.user_transactions == 'read'
// assert permissions.user_request_auth_code == 'create'
// assert permissions.user_orders == 'create,read,update,delete'
// assert permissions.user_secure_applications == 'create,read,update,delete'
// assert permissions.user_third_party_apps == 'read,delete'

// scopeMapper.setLegacyScopesAllowed(true)
// chPermissionsOut = scopeMapper.scopesToPermissions("https://identity.company-information.service.gov.uk/user.write-full", true)
// permissions = chPermissionsOut.getPermissions()
// assert permissions.size() == 8
// assert chPermissionsOut.isValid() == true
// assert permissions.user_applications == 'create,read,update,delete'
// assert permissions.user_profile == 'delete,read,update'
// assert permissions.user_following == 'read,update'
// assert permissions.user_transactions == 'read'
// assert permissions.user_request_auth_code == 'create'
// assert permissions.user_orders == 'create,read,update,delete'
// assert permissions.user_secure_applications == 'create,read,update,delete'
// assert permissions.user_third_party_apps == 'read,delete'

// scopeMapper.setLegacyScopesAllowed(true)
// chPermissionsOut = scopeMapper.scopesToPermissions("https://api.companieshouse.gov.uk/company/00006400/registered-office-address.update'")
// permissions = chPermissionsOut.getPermissions()
// assert permissions.size() == 2
// assert chPermissionsOut.isValid() == true
// assert permissions.company_number == '00006400'
// assert permissions.company_roa == 'update'

// scopeMapper.setLegacyScopesAllowed(true)
// chPermissionsOut = scopeMapper.scopesToPermissions("https://api.company-information.service.gov.uk/company/00006400/registered-office-address.update")
// permissions = chPermissionsOut.getPermissions()
// assert permissions.size() == 2
// assert chPermissionsOut.isValid() == true
// assert permissions.company_number == '00006400'
// assert permissions.company_roa == 'update'

// scopeMapper.setLegacyScopesAllowed(true)
// permissionsText = scopeMapper.scopesToPermissionText("https://account.companieshouse.gov.uk/user/profile.read https://api.companieshouse.gov.uk/company/00006400/registered-office-address.update", "Some Company Ltd")
// assert permissionsText.size() == 2
// assert permissionsText[0] == "This will allow it to view your email address."
// assert permissionsText[1] == "This will allow it to update Some Company Ltd's registered office address."

// scopeMapper.setLegacyScopesAllowed(true)
// permissionsText = scopeMapper.scopesToPermissionText("https://identity.company-information.service.gov.uk/user/profile.read https://api.company-information.service.gov.uk/company/00006400/registered-office-address.update", "Some Company Ltd")
// assert permissionsText.size() == 2
// assert permissionsText[0] == "This will allow it to view your email address."
// assert permissionsText[1] == "This will allow it to update Some Company Ltd's registered office address."
