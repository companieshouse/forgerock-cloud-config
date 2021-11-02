{
	"_id": "oidc_client",
	"coreOAuth2ClientConfig": {
		"agentgroup": null,
		"userpassword": "{IG_OIDC_PASSWORD}",
		"loopbackInterfaceRedirection": {
			"inherited": false,
			"value": false
		},
		"backchannel_logout_uri": {
			"inherited": false,
			"value": null
		},
		"defaultScopes": {
			"inherited": false,
			"value": []
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
				"email",
				"webfiling"
			]
		},
		"status": {
			"inherited": false,
			"value": "Active"
		},
		"accessTokenLifetime": {
			"inherited": false,
			"value": 2400
		},
		"redirectionUris": {
			"inherited": false,
			"value": [
				"http://localhost:8080/oidc/callback",
				"{EWF_URL}:443/oidc/callback",
				"{EWF_URL}/oidc/callback"
			]
		},
		"clientName": {
			"inherited": false,
			"value": []
		},
		"clientType": {
			"inherited": false,
			"value": "Confidential"
		},
		"authorizationCodeLifetime": {
			"inherited": false,
			"value": 0
		},
		"backchannel_logout_session_required": {
			"inherited": false,
			"value": false
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
				"id_token",
				"code token",
				"token id_token",
				"code id_token",
				"code token id_token",
				"device_code",
				"device_code id_token"
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
			"value": []
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
				"authorization_code",
				"password"
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
			"value": "HS256"
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
			"value": [
				"webfiling"
			]
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
			"value": []
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