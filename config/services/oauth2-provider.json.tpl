{
  "_id": "oauth-oidc",
  "_type": {
    "_id": "oauth-oidc",
    "name": "OAuth2 Provider",
    "collection": false
  },
  "advancedOIDCConfig": {
    "supportedRequestParameterEncryptionEnc": [
      "A256GCM",
      "A192GCM",
      "A128GCM",
      "A128CBC-HS256",
      "A192CBC-HS384",
      "A256CBC-HS512"
    ],
    "authorisedOpenIdConnectSSOClients": [],
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
    "useForceAuthnForPromptLogin": false,
    "alwaysAddClaimsToToken": true,
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
    "includeAllKtyAlgCombinationsInJwksUri": false,
    "amrMappings": {},
    "loaMapping": {
      "chs": "CHLogin",
      "webfiling": "CHWebFiling-Login",
      "webfilingcomp": "CHWebFiling"
    },
    "authorisedIdmDelegationClients": [],
    "idTokenInfoClientAuthenticationEnabled": true,
    "storeOpsTokens": true,
    "supportedUserInfoSigningAlgorithms": [
      "ES384",
      "HS256",
      "HS512",
      "ES256",
      "RS256",
      "HS384",
      "ES512"
    ],
    "supportedUserInfoEncryptionEnc": [
      "A256GCM",
      "A192GCM",
      "A128GCM",
      "A128CBC-HS256",
      "A192CBC-HS384",
      "A256CBC-HS512"
    ],
    "claimsParameterSupported": true,
    "supportedTokenIntrospectionResponseEncryptionEnc": [
      "A256GCM",
      "A192GCM",
      "A128GCM",
      "A128CBC-HS256",
      "A192CBC-HS384",
      "A256CBC-HS512"
    ],
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
    "defaultACR": []
  },
  "advancedOAuth2Config": {
    "passwordGrantAuthService": "PasswordGrant",
    "tokenCompressionEnabled": false,
    "tokenEncryptionEnabled": false,
    "tlsCertificateBoundAccessTokensEnabled": true,
    "defaultScopes": [
      "address",
      "phone",
      "openid",
      "profile",
      "email"
    ],
    "moduleMessageEnabledInPasswordGrant": false,
    "supportedSubjectTypes": [
      "public",
      "pairwise"
    ],
    "tlsClientCertificateHeaderFormat": "URLENCODED_PEM",
    "hashSalt": "n0FLWZh88zPTlWf2c3OEBlBd5r4=",
    "macaroonTokenFormat": "V2",
    "tlsCertificateRevocationCheckingEnabled": false,
    "responseTypeClasses": [
      "code|org.forgerock.oauth2.core.AuthorizationCodeResponseTypeHandler",
      "id_token|org.forgerock.openidconnect.IdTokenResponseTypeHandler",
      "device_code|org.forgerock.oauth2.core.TokenResponseTypeHandler",
      "token|org.forgerock.oauth2.core.TokenResponseTypeHandler"
    ],
    "tokenValidatorClasses": [
      "urn:ietf:params:oauth:token-type:id_token|org.forgerock.oauth2.core.tokenexchange.idtoken.OidcIdTokenValidator",
      "urn:ietf:params:oauth:token-type:access_token|org.forgerock.oauth2.core.tokenexchange.accesstoken.OAuth2AccessTokenValidator"
    ],
    "tokenSigningAlgorithm": "HS256",
    "codeVerifierEnforced": "false",
    "customLoginUrlTemplate": "https://idam-ui.amido.aws.chdev.org/account/login/?goto=${goto}<#if acrValues??>&acr_values=${acrValues}</#if><#if realm??>&realm=${realm}</#if><#if module??>&module=${module}</#if><#if service??>&service=${service}</#if><#if locale??>&locale=${locale}</#if><#if authIndexType??>&authIndexType=${authIndexType}</#if><#if authIndexValue??>&authIndexValue=${authIndexValue}</#if>&mode=AUTHN_ONLY",
    "displayNameAttribute": "cn",
    "tokenExchangeClasses": [
      "urn:ietf:params:oauth:token-type:access_token=>urn:ietf:params:oauth:token-type:access_token|org.forgerock.oauth2.core.tokenexchange.accesstoken.AccessTokenToAccessTokenExchanger",
      "urn:ietf:params:oauth:token-type:id_token=>urn:ietf:params:oauth:token-type:id_token|org.forgerock.oauth2.core.tokenexchange.idtoken.IdTokenToIdTokenExchanger",
      "urn:ietf:params:oauth:token-type:access_token=>urn:ietf:params:oauth:token-type:id_token|org.forgerock.oauth2.core.tokenexchange.accesstoken.AccessTokenToIdTokenExchanger",
      "urn:ietf:params:oauth:token-type:id_token=>urn:ietf:params:oauth:token-type:access_token|org.forgerock.oauth2.core.tokenexchange.idtoken.IdTokenToAccessTokenExchanger"
    ],
    "parRequestUriLifetime": 90,
    "allowedAudienceValues": [],
    "persistentClaims": [],
    "supportedScopes": [
      "email|Your email address",
      "openid|",
      "address|Your postal address",
      "phone|Your telephone number(s)",
      "fr:idm:*",
      "am-introspect-all-tokens",
      "profile|Your personal information"
    ],
    "authenticationAttributes": [
      "uid"
    ],
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
    ]
  },
  "clientDynamicRegistrationConfig": {
    "dynamicClientRegistrationScope": "dynamic_client_registration",
    "allowDynamicRegistration": false,
    "requiredSoftwareStatementAttestedAttributes": [
      "redirect_uris"
    ],
    "dynamicClientRegistrationSoftwareStatementRequired": false,
    "generateRegistrationAccessTokens": true
  },
  "coreOIDCConfig": {
    "overrideableOIDCClaims": [],
    "oidcDiscoveryEndpointEnabled": true,
    "supportedIDTokenEncryptionMethods": [
      "A256GCM",
      "A192GCM",
      "A128GCM",
      "A128CBC-HS256",
      "A192CBC-HS384",
      "A256CBC-HS512"
    ],
    "supportedClaims": [
      "company|en|company"
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
    ],
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
    "jwtTokenLifetime": 3600
  },
  "coreOAuth2Config": {
    "accessTokenLifetime": 3600,
    "issueRefreshTokenOnRefreshedToken": true,
    "oidcMayActScript": "[Empty]",
    "statelessTokensEnabled": true,
    "issueRefreshToken": true,
    "macaroonTokensEnabled": false,
    "usePolicyEngineForScope": false,
    "accessTokenMayActScript": "[Empty]",
    "refreshTokenLifetime": 604800,
    "codeLifetime": 120
  },
  "consent": {
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
    "supportedRcsRequestEncryptionMethods": [
      "A256GCM",
      "A192GCM",
      "A128GCM",
      "A128CBC-HS256",
      "A192CBC-HS384",
      "A256CBC-HS512"
    ],
    "remoteConsentServiceId": "journey-rcs",
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
    "clientsCanSkipConsent": true,
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
    ],
    "supportedRcsResponseEncryptionMethods": [
      "A256GCM",
      "A192GCM",
      "A128GCM",
      "A128CBC-HS256",
      "A192CBC-HS384",
      "A256CBC-HS512"
    ]
  },
  "pluginsConfig": {
    "evaluateScopeClass": "org.forgerock.openam.oauth2.OpenAMScopeValidator",
    "validateScopeScript": "[Empty]",
    "accessTokenEnricherClass": "org.forgerock.openam.oauth2.OpenAMScopeValidator",
    "oidcClaimsPluginType": "SCRIPTED",
    "authorizeEndpointDataProviderClass": "org.forgerock.openam.oauth2.OpenAMScopeValidator",
    "authorizeEndpointDataProviderPluginType": "JAVA",
    "evaluateScopeScript": "[Empty]",
    "oidcClaimsClass": "org.forgerock.openam.oauth2.OpenAMScopeValidator",
    "evaluateScopePluginType": "JAVA",
    "authorizeEndpointDataProviderScript": "[Empty]",
    "accessTokenModifierClass": "org.forgerock.openam.oauth2.OpenAMScopeValidator",
    "accessTokenModificationScript": "d22f9a0c-426a-4466-b95e-d0f125b0d5fa",
    "validateScopePluginType": "JAVA",
    "accessTokenModificationPluginType": "SCRIPTED",
    "oidcClaimsScript": "36863ffb-40ec-48b9-94b1-9a99f71cc3b5",
    "validateScopeClass": "org.forgerock.openam.oauth2.OpenAMScopeValidator"
  },
  "deviceCodeConfig": {
    "deviceCodeLifetime": 300,
    "devicePollInterval": 5
  },
  "cibaConfig": {
    "cibaMinimumPollingInterval": 2,
    "supportedCibaSigningAlgorithms": [
      "ES256",
      "PS256"
    ],
    "cibaAuthReqIdLifetime": 600
  }
}
