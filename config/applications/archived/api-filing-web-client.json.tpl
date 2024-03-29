{
	"_id": "ApiFilingWebClient",
	"overrideOAuth2ClientConfig":{
		"oidcClaimsPluginType":"SCRIPTED",
		"customLoginUrlTemplate":"https://idam-ui.amido.aws.chdev.org/account/chslogin/?goto=${goto}<#if acrValues??>&acr_values=${acrValues}</#if><#if realm??>&realm=${realm}</#if><#if module??>&module=${module}</#if><#if service??>&service=${service}</#if><#if locale??>&locale=${locale}</#if><#if authIndexType??>&authIndexType=${authIndexType}</#if><#if authIndexValue??>&authIndexValue=${authIndexValue}</#if><#if claims??>&claims=${claims}</#if>&mode=AUTHN_ONLY&ForceAuth=true",
		"oidcClaimsClass":"",
		"accessTokenModifierClass":"",
		"accessTokenModificationPluginType":"SCRIPTED",
		"validateScopePluginType":"JAVA",
		"statelessTokensEnabled":true,
		"overrideableOIDCClaims":[
			
		],
		"clientsCanSkipConsent":false,
		"oidcClaimsScript":"36863ffb-40ec-48b9-94b1-9a99f71cc3b5",
		"usePolicyEngineForScope":false,
		"authorizeEndpointDataProviderClass":"",
		"validateScopeClass":"",
		"enableRemoteConsent":true,
		"remoteConsentServiceId":"journey-rcs",
		"oidcMayActScript":"[Empty]",
		"validateScopeScript":"[Empty]",
		"providerOverridesEnabled":true,
		"authorizeEndpointDataProviderScript":"[Empty]",
		"evaluateScopeClass":"",
		"tokenEncryptionEnabled":false,
		"evaluateScopeScript":"[Empty]",
		"issueRefreshTokenOnRefreshedToken":false,
		"authorizeEndpointDataProviderPluginType":"JAVA",
		"issueRefreshToken":true,
		"accessTokenMayActScript":"[Empty]",
		"evaluateScopePluginType":"JAVA",
		"accessTokenModificationScript":"e24385ea-a00e-4c9f-8eda-4f61e752dfb7"
    },
	"coreOAuth2ClientConfig": {
		"userpassword": "{API_FILING_CLIENT_PASSWORD}",
		"loopbackInterfaceRedirection": {
			"inherited": false,
			"value": false
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
				"https://account.companieshouse.gov.uk/user/profile.read",
				"https://identity.company-information.service.gov.uk/user/profile.read",
				"https://api.companieshouse.gov.uk/company/registered-office-address.update",
				"https://api.company-information.service.gov.uk/company/registered-office-address.update"
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
				"http://localhost:8090/redirect",
				"https://test-harness-api-filing-webapp.amido.aws.chdev.org/redirect"
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
				"{UI_URL}",
				"{UI_URL}:443"
			]
		},
		"policyUri": {
			"inherited": false,
			"value": []
		},
		"softwareVersion": {
			"inherited": false
		},
		"sectorIdentifierUri": {
			"inherited": false
		},
		"tosURI": {
			"inherited": false,
			"value": []
		},
		"tokenEndpointAuthMethod": {
			"inherited": false,
			"value": "client_secret_post"
		},
		"isConsentImplied": {
			"inherited": false,
			"value": false
		},
		"softwareIdentity": {
			"inherited": false
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
		"mTLSCertificateBoundAccessTokens": {
			"inherited": false,
			"value": false
		},
		"userinfoResponseFormat": {
			"inherited": false,
			"value": "JSON"
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
		"userinfoEncryptedResponseEncryptionAlgorithm": {
			"inherited": false,
			"value": "A128CBC-HS256"
		},
		"tokenIntrospectionSignedResponseAlg": {
			"inherited": false,
			"value": "RS256"
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
		"backchannel_logout_uri": {
			"inherited": false
		},
		"defaultAcrValues": {
			"inherited": false,
			"value": [
				"chs"
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
			"value": [
				"http://localhost:8090/redirect",
				"https://test-harness-api-filing-webapp.amido.aws.chdev.org/redirect"
			]
		},
		"backchannel_logout_session_required": {
			"inherited": false,
			"value": false
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