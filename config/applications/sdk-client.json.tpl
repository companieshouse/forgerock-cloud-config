{
  "_id": "ForgeRockSDKClient",
  "coreOAuth2ClientConfig": {
    "loopbackInterfaceRedirection": {
      "inherited": false,
      "value": false
    },
    "defaultScopes": {
      "inherited": false,
      "value":[
        "email",
        "profile",
        "phone"
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
        "fr:idm:*",
        "email",
        "profile",
        "phone"
      ]
    },
    "status": {
      "inherited": false,
      "value": "Active"
    },
    "accessTokenLifetime": {
      "inherited": false,
      "value": 0
    },
    "redirectionUris": {
      "inherited": false,
      "value": [
        "forgerock://oidc_callback",
        "http://localhost:3000",
        "http://localhost:3000/_callback",
        "http://localhost:3000/account/home/",
        "{REPLACEMENT_UI_URL}",
        "{REPLACEMENT_UI_URL}/account/home/",
        "{REPLACEMENT_UI_URL}/_callback"
      ]
    },
    "clientName": {
      "inherited": false,
      "value": []
    },
    "clientType": {
      "inherited": false,
      "value": "Public"
    },
    "authorizationCodeLifetime": {
      "inherited": false,
      "value": 0
    }
  },
  "advancedOAuth2ClientConfig": {
    "descriptions": {
      "inherited": false,
      "value": []
    },
    "requestUris": {
      "inherited": false,
      "value": []
    },
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
    "name": {
      "inherited": false,
      "value": []
    },
    "contacts": {
      "inherited": false,
      "value": []
    },
    "responseTypes": {
      "inherited": false,
      "value": [
        "code",
        "token",
        "id_token"
      ]
    },
    "updateAccessToken": {
      "inherited": false
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
        "forgerock://oidc_callback",
        "{REPLACEMENT_UI_URL}",
        "http://localhost:3000"
      ]
    },
    "policyUri": {
      "inherited": false,
      "value": []
    },
    "sectorIdentifierUri": {
      "inherited": false
    },
    "tokenEndpointAuthMethod": {
      "inherited": false,
      "value": "none"
    },
    "isConsentImplied": {
      "inherited": false,
      "value": true
    },
    "grantTypes": {
      "inherited": false,
      "value": [
        "authorization_code",
        "refresh_token"
      ]
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
    "clientJwtPublicKey": {
      "inherited": false
    },
    "idTokenPublicEncryptionKey": {
      "inherited": false
    },
    "mTLSSubjectDN": {
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
    "jwkStoreCacheMissCacheTime": {
      "inherited": false,
      "value": 60000
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
    "mTLSTrustedCert": {
      "inherited": false
    },
    "jwkSet": {
      "inherited": false
    },
    "idTokenEncryptionMethod": {
      "inherited": false,
      "value": "A128CBC-HS256"
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
    "jwksUri": {
      "inherited": false
    },
    "tokenIntrospectionSignedResponseAlg": {
      "inherited": false,
      "value": "RS256"
    },
    "userinfoEncryptedResponseEncryptionAlgorithm": {
      "inherited": false,
      "value": "A128CBC-HS256"
    },
    "tokenIntrospectionEncryptedResponseAlg": {
      "inherited": false,
      "value": "RSA-OAEP-256"
    }
  },
  "coreOpenIDClientConfig": {
    "claims": {
      "inherited": false,
      "value": []
    },
    "clientSessionUri": {
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
    "defaultMaxAge": {
      "inherited": false,
      "value": 600
    },
    "postLogoutRedirectUri": {
      "inherited": false,
      "value": [
        "forgerock://oidc_callback",
        "http://localhost:3000",
        "http://localhost:3000/_callback",
        "{REPLACEMENT_UI_URL}",
        "{REPLACEMENT_UI_URL}/_callback"
      ]
    }
  },
  "coreUmaClientConfig": {
    "claimsRedirectionUris": {
      "inherited": false,
      "value": []
    }
  }
}