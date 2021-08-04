{
    "_id": "oauth-oidc",
    "_type": {
        "_id": "oauth-oidc",
        "name": "OAuth2 Provider",
        "collection": false
    },
    "advancedOAuth2Config": {
        "allowedAudienceValues": [],
        "authenticationAttributes": [
            "uid"
        ],
        "codeVerifierEnforced": "false",
        "customLoginUrlTemplate": "https://idam-ui.amido.aws.chdev.org/account/login/?goto=${goto}<#if acrValues??>&acr_values=${acrValues}</#if><#if realm??>&realm=${realm}</#if><#if module??>&module=${module}</#if><#if service??>&service=${service}</#if><#if locale??>&locale=${locale}</#if><#if authIndexType??>&authIndexType=${authIndexType}</#if><#if authIndexValue??>&authIndexValue=${authIndexValue}</#if>&mode=AUTHN_ONLY",
        "defaultScopes": [
            "address",
            "phone",
            "openid",
            "profile",
            "email"
        ],
        "displayNameAttribute": "cn",
        "grantTypes": [
            "implicit",
            "urn:ietf:params:oauth:grant-type:saml2-bearer",
            "refresh_token",
            "password",
            "client_credentials",
            "urn:ietf:params:oauth:grant-type:device_code",
            "authorization_code",
            "urn:openid:params:grant-type:ciba",
            "urn:ietf:params:oauth:grant-type:uma-ticket",
            "urn:ietf:params:oauth:grant-type:jwt-bearer"
        ],
        "hashSalt": "{HASH_SALT}",
        "macaroonTokenFormat": "V2",
        "moduleMessageEnabledInPasswordGrant": false,
        "passwordGrantAuthService": "PasswordGrant",
        "responseTypeClasses": [
            "code|org.forgerock.oauth2.core.AuthorizationCodeResponseTypeHandler",
            "id_token|org.forgerock.openidconnect.IdTokenResponseTypeHandler",
            "device_code|org.forgerock.oauth2.core.TokenResponseTypeHandler",
            "token|org.forgerock.oauth2.core.TokenResponseTypeHandler"
        ],
        "scopeImplementationClass": "org.forgerock.openam.oauth2.OpenAMScopeValidator",
        "supportedScopes": [
            "email|Your email address",
            "openid|",
            "address|Your postal address",
            "phone|Your telephone number(s)",
            "fr:idm:*",
            "am-introspect-all-tokens",
            "profile|Your personal information"
        ],
        "supportedSubjectTypes": [
            "public",
            "pairwise"
        ],
        "tlsCertificateBoundAccessTokensEnabled": true,
        "tlsCertificateRevocationCheckingEnabled": false,
        "tlsClientCertificateHeaderFormat": "URLENCODED_PEM",
        "tokenCompressionEnabled": false,
        "tokenEncryptionEnabled": false,
        "tokenExchangeClasses": [
            "urn:ietf:params:oauth:token-type:access_token=>urn:ietf:params:oauth:token-type:access_token|org.forgerock.oauth2.core.tokenexchange.accesstoken.AccessTokenToAccessTokenExchanger",
            "urn:ietf:params:oauth:token-type:id_token=>urn:ietf:params:oauth:token-type:id_token|org.forgerock.oauth2.core.tokenexchange.idtoken.IdTokenToIdTokenExchanger",
            "urn:ietf:params:oauth:token-type:access_token=>urn:ietf:params:oauth:token-type:id_token|org.forgerock.oauth2.core.tokenexchange.accesstoken.AccessTokenToIdTokenExchanger",
            "urn:ietf:params:oauth:token-type:id_token=>urn:ietf:params:oauth:token-type:access_token|org.forgerock.oauth2.core.tokenexchange.idtoken.IdTokenToAccessTokenExchanger"
        ],
        "tokenSigningAlgorithm": "HS256",
        "tokenValidatorClasses": [
            "urn:ietf:params:oauth:token-type:id_token|org.forgerock.oauth2.core.tokenexchange.idtoken.OidcIdTokenValidator",
            "urn:ietf:params:oauth:token-type:access_token|org.forgerock.oauth2.core.tokenexchange.accesstoken.OAuth2AccessTokenValidator"
        ]
    },
    "advancedOIDCConfig": {
        "supportedTokenEndpointAuthenticationSigningAlgorithms": [
            "PS384",
            "ES384",
            "RS384",
            "HS256",
            "HS512",
            "ES256",
            "RS256",
            "HS384",
            "ES512",
            "PS256",
            "PS512",
            "RS512"
        ],
        "supportedRequestParameterEncryptionEnc": [
            "A256GCM",
            "A192GCM",
            "A128GCM",
            "A128CBC-HS256",
            "A192CBC-HS384",
            "A256CBC-HS512"
        ],
        "loaMapping": {
            "webfiling": "CHWebFiling-Login",
            "chs": "CHLogin"
        },
        "storeOpsTokens": true,
        "supportedUserInfoEncryptionEnc": [
            "A256GCM",
            "A192GCM",
            "A128GCM",
            "A128CBC-HS256",
            "A192CBC-HS384",
            "A256CBC-HS512"
        ],
        "supportedTokenIntrospectionResponseSigningAlgorithms": [
            "PS384",
            "RS384",
            "EdDSA",
            "ES384",
            "HS256",
            "HS512",
            "ES256",
            "RS256",
            "HS384",
            "ES512",
            "PS256",
            "PS512",
            "RS512"
        ],
        "idTokenInfoClientAuthenticationEnabled": true,
        "supportedRequestParameterSigningAlgorithms": [
            "PS384",
            "ES384",
            "RS384",
            "HS256",
            "HS512",
            "ES256",
            "RS256",
            "HS384",
            "ES512",
            "PS256",
            "PS512",
            "RS512"
        ],
        "supportedUserInfoSigningAlgorithms": [
            "ES384",
            "HS256",
            "HS512",
            "ES256",
            "RS256",
            "HS384",
            "ES512"
        ],
        "supportedTokenIntrospectionResponseEncryptionEnc": [
            "A256GCM",
            "A192GCM",
            "A128GCM",
            "A128CBC-HS256",
            "A192CBC-HS384",
            "A256CBC-HS512"
        ],
        "amrMappings": {},
        "claimsParameterSupported": true,
        "supportedUserInfoEncryptionAlgorithms": [
            "ECDH-ES+A256KW",
            "ECDH-ES+A192KW",
            "RSA-OAEP",
            "ECDH-ES+A128KW",
            "RSA-OAEP-256",
            "A128KW",
            "A256KW",
            "ECDH-ES",
            "dir",
            "A192KW"
        ],
        "defaultACR": [],
        "authorisedOpenIdConnectSSOClients": [],
        "includeAllKtyAlgCombinationsInJwksUri": false,
        "supportedRequestParameterEncryptionAlgorithms": [
            "ECDH-ES+A256KW",
            "ECDH-ES+A192KW",
            "ECDH-ES+A128KW",
            "RSA-OAEP",
            "RSA-OAEP-256",
            "A128KW",
            "A256KW",
            "ECDH-ES",
            "dir",
            "A192KW"
        ],
        "alwaysAddClaimsToToken": true,
        "supportedTokenIntrospectionResponseEncryptionAlgorithms": [
            "ECDH-ES+A256KW",
            "ECDH-ES+A192KW",
            "RSA-OAEP",
            "ECDH-ES+A128KW",
            "RSA-OAEP-256",
            "A128KW",
            "A256KW",
            "ECDH-ES",
            "dir",
            "A192KW"
        ],
        "authorisedIdmDelegationClients": []
    },
    "cibaConfig": {
        "cibaAuthReqIdLifetime": 600,
        "cibaMinimumPollingInterval": 2,
        "supportedCibaSigningAlgorithms": [
            "ES256",
            "PS256"
        ]
    },
    "clientDynamicRegistrationConfig": {
        "allowDynamicRegistration": false,
        "dynamicClientRegistrationScope": "dynamic_client_registration",
        "dynamicClientRegistrationSoftwareStatementRequired": false,
        "generateRegistrationAccessTokens": true,
        "requiredSoftwareStatementAttestedAttributes": [
            "redirect_uris"
        ]
    },
    "consent": {
        "clientsCanSkipConsent": true,
        "enableRemoteConsent": false,
        "supportedRcsRequestEncryptionAlgorithms": [
            "ECDH-ES+A256KW",
            "ECDH-ES+A192KW",
            "RSA-OAEP",
            "ECDH-ES+A128KW",
            "RSA-OAEP-256",
            "A128KW",
            "A256KW",
            "ECDH-ES",
            "dir",
            "A192KW"
        ],
        "supportedRcsRequestEncryptionMethods": [
            "A256GCM",
            "A192GCM",
            "A128GCM",
            "A128CBC-HS256",
            "A192CBC-HS384",
            "A256CBC-HS512"
        ],
        "supportedRcsRequestSigningAlgorithms": [
            "PS384",
            "ES384",
            "RS384",
            "HS256",
            "HS512",
            "ES256",
            "RS256",
            "HS384",
            "ES512",
            "PS256",
            "PS512",
            "RS512"
        ],
        "supportedRcsResponseEncryptionAlgorithms": [
            "ECDH-ES+A256KW",
            "ECDH-ES+A192KW",
            "ECDH-ES+A128KW",
            "RSA-OAEP",
            "RSA-OAEP-256",
            "A128KW",
            "A256KW",
            "ECDH-ES",
            "dir",
            "A192KW"
        ],
        "supportedRcsResponseEncryptionMethods": [
            "A256GCM",
            "A192GCM",
            "A128GCM",
            "A128CBC-HS256",
            "A192CBC-HS384",
            "A256CBC-HS512"
        ],
        "supportedRcsResponseSigningAlgorithms": [
            "PS384",
            "ES384",
            "RS384",
            "HS256",
            "HS512",
            "ES256",
            "RS256",
            "HS384",
            "ES512",
            "PS256",
            "PS512",
            "RS512"
        ]
    },
    "coreOAuth2Config": {
        "accessTokenLifetime": 3600,
        "accessTokenModificationScript": "d22f9a0c-426a-4466-b95e-d0f125b0d5fa",
        "codeLifetime": 120,
        "issueRefreshToken": true,
        "issueRefreshTokenOnRefreshedToken": true,
        "macaroonTokensEnabled": false,
        "refreshTokenLifetime": 604800,
        "statelessTokensEnabled": true,
        "usePolicyEngineForScope": false
    },
    "coreOIDCConfig": {
        "jwtTokenLifetime": 3600,
        "oidcClaimsScript": "36863ffb-40ec-48b9-94b1-9a99f71cc3b5",
        "oidcDiscoveryEndpointEnabled": true,
        "overrideableOIDCClaims": [],
        "supportedClaims": ["company|en|company"],
        "supportedIDTokenEncryptionAlgorithms": [
            "ECDH-ES+A256KW",
            "ECDH-ES+A192KW",
            "RSA-OAEP",
            "ECDH-ES+A128KW",
            "RSA-OAEP-256",
            "A128KW",
            "A256KW",
            "ECDH-ES",
            "dir",
            "A192KW"
        ],
        "supportedIDTokenEncryptionMethods": [
            "A256GCM",
            "A192GCM",
            "A128GCM",
            "A128CBC-HS256",
            "A192CBC-HS384",
            "A256CBC-HS512"
        ],
        "supportedIDTokenSigningAlgorithms": [
            "PS384",
            "ES384",
            "RS384",
            "HS256",
            "HS512",
            "ES256",
            "RS256",
            "HS384",
            "ES512",
            "PS256",
            "PS512",
            "RS512"
        ]
    },
    "deviceCodeConfig": {
        "deviceCodeLifetime": 300,
        "devicePollInterval": 5
    }
}