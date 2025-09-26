{
	"_id": "journey-rcs",
	"userpassword": "{RCS_AGENT_PASSWORD}",
	"remoteConsentRequestEncryptionAlgorithm": {
		"inherited": false,
		"value": "RSA-OAEP-256"
	},
	"publicKeyLocation": {
		"inherited": false,
		"value": "jwks_uri"
	},
	"jwksCacheTimeout": {
		"inherited": false,
		"value": 3600000
	},
	"remoteConsentResponseSigningAlg": {
		"inherited": false,
		"value": "HS256"
	},
	"remoteConsentRequestSigningAlgorithm": {
		"inherited": false,
		"value": "RS256"
	},
	"jwkSet": {
		"inherited": false
	},
	"jwkStoreCacheMissCacheTime": {
		"inherited": false,
		"value": 60000
	},
	"remoteConsentResponseEncryptionMethod": {
		"inherited": false,
		"value": "A128GCM"
	},
	"remoteConsentRedirectUrl": {
		"inherited": false,
		"value": "https://idam-ui-dev.company-information.service.gov.uk/account/consent/?authIndexType=service&authIndexValue=CHConsent&ForceAuth=true"
	},
	"remoteConsentRequestEncryptionEnabled": {
		"inherited": false,
		"value": false
	},
	"remoteConsentRequestEncryptionMethod": {
		"inherited": false,
		"value": "A128GCM"
	},
	"remoteConsentResponseEncryptionAlgorithm": {
		"inherited": false,
		"value": "RSA-OAEP-256"
	},
	"requestTimeLimit": {
		"inherited": false,
		"value": 180
	},
	"jwksUri": {
		"inherited": false
	},
	"_type": {
		"_id": "RemoteConsentAgent",
		"name": "OAuth2 Remote Consent Service",
		"collection": true
	}
}