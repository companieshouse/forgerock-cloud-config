{
    "_id": "PerfTestClient",
    "overrideOAuth2ClientConfig": {
        "issueRefreshToken": true,
        "validateScopePluginType": "PROVIDER",
        "tokenEncryptionEnabled": false,
        "evaluateScopePluginType": "PROVIDER",
        "oidcMayActScript": "[Empty]",
        "oidcClaimsScript": "1f389a3d-21cf-417c-a6d3-42ea620071f0",
        "scopesPolicySet": "oauth2Scopes",
        "accessTokenModificationPluginType": "PROVIDER",
        "authorizeEndpointDataProviderClass": "org.forgerock.oauth2.core.plugins.registry.DefaultEndpointDataProvider",
        "oidcClaimsPluginType": "PROVIDER",
        "providerOverridesEnabled": false,
        "authorizeEndpointDataProviderScript": "[Empty]",
        "statelessTokensEnabled": false,
        "authorizeEndpointDataProviderPluginType": "PROVIDER",
        "remoteConsentServiceId": "[Empty]",
        "enableRemoteConsent": false,
        "validateScopeClass": "org.forgerock.oauth2.core.plugins.registry.DefaultScopeValidator",
        "usePolicyEngineForScope": false,
        "evaluateScopeClass": "org.forgerock.oauth2.core.plugins.registry.DefaultScopeEvaluator",
        "overrideableOIDCClaims": [],
        "accessTokenMayActScript": "[Empty]",
        "evaluateScopeScript": "[Empty]",
        "clientsCanSkipConsent": false,
        "accessTokenModificationScript": "d22f9a0c-426a-4466-b95e-d0f125b0d5fa",
        "issueRefreshTokenOnRefreshedToken": true,
        "validateScopeScript": "[Empty]"
    },
    "advancedOAuth2ClientConfig": {
        "logoUri": {
            "inherited": false,
            "value": []
        },
        "subjectType": {
            "inherited": false,
            "value": "public"
        },
        "clientUri": {
            "inherited": false,
            "value": []
        },
        "tokenExchangeAuthLevel": {
            "inherited": false,
            "value": 0
        },
        "responseTypes": {
            "inherited": false,
            "value": [
                "code",
                "token",
                "id_token",
                "code token",
                "token id_token",
                "code id_token",
                "code token id_token",
                "device_code",
                "device_code id_token"
            ]
        },
        "mixUpMitigation": {
            "inherited": false,
            "value": false
        },
        "customProperties": {
            "inherited": false,
            "value": []
        },
        "javascriptOrigins": {
            "inherited": false,
            "value": [
                "http://localhost:8090",
                "https://idam-ui.amido.aws.chdev.org",
                "https://idam-ui.amido.aws.chdev.org:443"
            ]
        },
        "policyUri": {
            "inherited": false,
            "value": []
        },
        "softwareVersion": {
            "inherited": false
        },
        "tosURI": {
            "inherited": false,
            "value": []
        },
        "sectorIdentifierUri": {
            "inherited": false
        },
        "tokenEndpointAuthMethod": {
            "inherited": false,
            "value": "client_secret_post"
        },
        "refreshTokenGracePeriod": {
            "inherited": false,
            "value": 0
        },
        "isConsentImplied": {
            "inherited": false,
            "value": true
        },
        "softwareIdentity": {
            "inherited": false
        },
        "grantTypes": {
            "inherited": false,
            "value": [
                "authorization_code"
            ]
        },
        "require_pushed_authorization_requests": {
            "inherited": false,
            "value": false
        },
        "descriptions": {
            "inherited": false,
            "value": []
        },
        "requestUris": {
            "inherited": false,
            "value": []
        },
        "name": {
            "inherited": false,
            "value": []
        },
        "contacts": {
            "inherited": false,
            "value": []
        },
        "updateAccessToken": {
            "inherited": false
        }
    },
    "signEncOAuth2ClientConfig": {
        "tokenEndpointAuthSigningAlgorithm": {
            "inherited": false,
            "value": "RS256"
        },
        "idTokenEncryptionEnabled": {
            "inherited": false,
            "value": false
        },
        "tokenIntrospectionEncryptedResponseEncryptionAlgorithm": {
            "inherited": false,
            "value": "A128CBC-HS256"
        },
        "requestParameterSignedAlg": {
            "inherited": false
        },
        "authorizationResponseSigningAlgorithm": {
            "inherited": false,
            "value": "RS256"
        },
        "clientJwtPublicKey": {
            "inherited": false
        },
        "idTokenPublicEncryptionKey": {
            "inherited": false
        },
        "mTLSSubjectDN": {
            "inherited": false
        },
        "jwkStoreCacheMissCacheTime": {
            "inherited": false,
            "value": 60000
        },
        "jwkSet": {
            "inherited": false
        },
        "idTokenEncryptionMethod": {
            "inherited": false,
            "value": "A128CBC-HS256"
        },
        "jwksUri": {
            "inherited": false
        },
        "tokenIntrospectionEncryptedResponseAlg": {
            "inherited": false,
            "value": "RSA-OAEP-256"
        },
        "authorizationResponseEncryptionMethod": {
            "inherited": false
        },
        "userinfoResponseFormat": {
            "inherited": false,
            "value": "JSON"
        },
        "mTLSCertificateBoundAccessTokens": {
            "inherited": false,
            "value": false
        },
        "publicKeyLocation": {
            "inherited": false,
            "value": "jwks_uri"
        },
        "tokenIntrospectionResponseFormat": {
            "inherited": false,
            "value": "JSON"
        },
        "requestParameterEncryptedEncryptionAlgorithm": {
            "inherited": false,
            "value": "A128CBC-HS256"
        },
        "userinfoSignedResponseAlg": {
            "inherited": false
        },
        "idTokenEncryptionAlgorithm": {
            "inherited": false,
            "value": "RSA-OAEP-256"
        },
        "requestParameterEncryptedAlg": {
            "inherited": false
        },
        "authorizationResponseEncryptionAlgorithm": {
            "inherited": false
        },
        "mTLSTrustedCert": {
            "inherited": false
        },
        "jwksCacheTimeout": {
            "inherited": false,
            "value": 3600000
        },
        "userinfoEncryptedResponseAlg": {
            "inherited": false
        },
        "idTokenSignedResponseAlg": {
            "inherited": false,
            "value": "RS256"
        },
        "tokenIntrospectionSignedResponseAlg": {
            "inherited": false,
            "value": "RS256"
        },
        "userinfoEncryptedResponseEncryptionAlgorithm": {
            "inherited": false,
            "value": "A128CBC-HS256"
        }
    },
    "coreOpenIDClientConfig": {
        "claims": {
            "inherited": false,
            "value": []
        },
        "backchannel_logout_uri": {
            "inherited": false
        },
        "defaultAcrValues": {
            "inherited": false,
            "value": []
        },
        "jwtTokenLifetime": {
            "inherited": false,
            "value": 0
        },
        "defaultMaxAgeEnabled": {
            "inherited": false,
            "value": false
        },
        "clientSessionUri": {
            "inherited": false
        },
        "defaultMaxAge": {
            "inherited": false,
            "value": 600
        },
        "postLogoutRedirectUri": {
            "inherited": false,
            "value": []
        },
        "backchannel_logout_session_required": {
            "inherited": false,
            "value": false
        }
    },
    "coreOAuth2ClientConfig": {
        "userpassword": "{PERF_TEST_OIDC_PASSWORD}",
        "status": {
            "inherited": false,
            "value": "Active"
        },
        "clientName": {
            "inherited": false,
            "value": []
        },
        "clientType": {
            "inherited": false,
            "value": "Confidential"
        },
        "loopbackInterfaceRedirection": {
            "inherited": false,
            "value": false
        },
        "defaultScopes": {
            "inherited": false,
            "value": [
                "openid",
                "profile"
            ]
        },
        "refreshTokenLifetime": {
            "inherited": false,
            "value": 0
        },
        "scopes": {
            "inherited": false,
            "value": [
                "openid",
                "profile",
                "fr:idm:*",
                "phone",
                "email"
            ]
        },
        "accessTokenLifetime": {
            "inherited": false,
            "value": 0
        },
        "redirectionUris": {
            "inherited": false,
            "value": [
                "http://localhost:8090/login",
                "https://idam-ui.amido.aws.chdev.org/account/home/"
            ]
        },
        "authorizationCodeLifetime": {
            "inherited": false,
            "value": 0
        }
    },
    "coreUmaClientConfig": {
        "claimsRedirectionUris": {
            "inherited": false,
            "value": []
        }
    },
    "_type": {
        "_id": "OAuth2Client",
        "name": "OAuth2 Clients",
        "collection": true
    }
}