  (function () {


    const apiPass = identityServer.getProperty('esv.am.api.pass');
    const apiUser = identityServer.getProperty('esv.am.api.user');

    let auth1 = {
      'url': 'https://openam-companieshouse-uk-dev.id.forgerock.io/am/json/realms/root/authenticate',
      'method': 'POST',
      'headers': {
        'Content-Type': 'application/json'
      }
    };

    let authId = openidm.action('external/rest', 'call', auth1).authId;

    const userRequestBody = {
    authId: authId,
    callbacks: [
      {
        type: 'NameCallback',
        output: [
          {
            name: 'prompt',
            value: 'User Name'
          }
        ],
        input: [
          {
            name: 'IDToken1',
            value: apiUser
          }
        ],
        _id: 0
      },
      {
        type: 'PasswordCallback',
        output: [
          {
            name: 'prompt',
            value: 'Password'
          }
        ],
        input: [
          {
            name: 'IDToken2',
            value: apiPass
          }
        ],
        _id: 1
      }
    ]
  }

    let auth2 = {
      'url': 'https://openam-companieshouse-uk-dev.id.forgerock.io/am/json/realms/root/authenticate',
      'method': 'POST',
      'headers': {
        'Content-Type': 'application/json'
      },
      'body': JSON.stringify(userRequestBody)
    };

   authId = openidm.action('external/rest', 'call', auth2).authId;

   const mfaPromptRequestBody = {
    authId: authId,
    callbacks: [
      {
        type: 'TextOutputCallback',
        output: [
          {
            name: 'message',
            value: 'message'
          },
          {
            name: 'messageType',
            value: '0'
          }
        ]
      },
      {
        type: 'ConfirmationCallback',
        output: [
          {
            name: 'prompt',
            value: ''
          },
          {
            name: 'messageType',
            value: 0
          },
          {
            name: 'options',
            value: ['Set up']
          },
          {
            name: 'optionType',
            value: -1
          },
          {
            name: 'defaultOption',
            value: 0
          }
        ],
        input: [
          {
            name: 'IDToken2',
            value: 0
          }
        ]
      },
      {
        type: 'HiddenValueCallback',
        output: [
          {
            name: 'value',
            value: 'false'
          },
          {
            name: 'id',
            value: 'skip-input'
          }
        ],
        input: [
          {
            name: 'IDToken3',
            value: 'Skip'
          }
        ]
      },
      {
        type: 'TextOutputCallback',
        output: [
          {
            name: 'message',
            value:
              'var skipContainer = document.createElement("div");skipContainer.style = "width: 100%";skipContainer.innerHTML = "<button id=\'skip-link\' class=\'btn btn-block btn-link\' type=\'submit\'>Skip for now</button>";document.getElementById("skip-input").parentNode.append(skipContainer);document.getElementsByClassName("callback-component").forEach(  function (e) {    var message = e.firstElementChild;    if (message.firstChild && message.firstChild.nodeName == "#text" && message.firstChild.nodeValue.trim() == "message") {      message.align = "center";      message.innerHTML = "<h2 class=\'h2\'>Set up 2-step verification</h2><div style=\'margin-bottom:1em\'>Protect your account by adding a second step after entering your password to verify it\'s you signing in.</div>";    }  })'
          },
          {
            name: 'messageType',
            value: '4'
          }
        ]
      },
      {
        type: 'TextOutputCallback',
        output: [
          {
            name: 'message',
            value:
              'document.getElementById("skip-link").onclick = function() {  document.getElementById("skip-input").value = "Skip";  document.getElementById("loginButton_0").click();  return false;}'
          },
          {
            name: 'messageType',
            value: '4'
          }
        ]
      }
    ]
  }

     let auth3 = {
      'url': 'https://openam-companieshouse-uk-dev.id.forgerock.io/am/json/realms/root/authenticate',
      'method': 'POST',
      'headers': {
        'Content-Type': 'application/json'
      },
      'body': JSON.stringify(mfaPromptRequestBody)
    };

    let tokenId = openidm.action('external/rest', 'call', auth3).tokenId

    let clientId = request.content.clientId;

    let chsResponse = openidm.query(
           'system/CHSApiClientKeys/api_client_keys',
           { '_queryFilter': '/client_id eq "' + clientId + '"' }
         );

    let firstClientKey = chsResponse.result[0];
    let redirectionUris = firstClientKey.redirect_uris;

    let oauthClientBody =
    {
      "coreOAuth2ClientConfig": {
          "userpassword": request.content.clientSecret,
          "loopbackInterfaceRedirection": {
              "inherited": false,
              "value": false
          },
          "defaultScopes": [
              "openid",
              "profile"
          ],
          "redirectionUris": redirectionUris,
          "scopes": [
              "openid",
              "profile"
          ],
          "status": {
              "inherited": false,
              "value": "Active"
          },
          "accessTokenLifetime": {
              "inherited": false,
              "value": 0
          },
          "redirectionUris": redirectionUris,
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
      "overrideOAuth2ClientConfig": {
          "issueRefreshToken": true,
          "authorizeEndpointDataProviderPluginType": "JAVA",
          "validateScopePluginType": "JAVA",
          "remoteConsentServiceId": "[Empty]",
          "tokenEncryptionEnabled": false,
          "enableRemoteConsent": false,
          "evaluateScopePluginType": "JAVA",
          "customLoginUrlTemplate": "https://idam-ui-dev.company-information.service.gov.uk/account/chslogin/?goto=${goto}<#if acrValues??>&acr_values=${acrValues}</#if><#if realm??>&realm=${realm}</#if><#if module??>&module=${module}</#if><#if service??>&service=${service}</#if><#if locale??>&locale=${locale}</#if><#if authIndexType??>&authIndexType=${authIndexType}</#if><#if authIndexValue??>&authIndexValue=${authIndexValue}</#if><#if claims??>&claims=${claims}</#if>&mode=AUTHN_ONLY&ForceAuth=true",
          "usePolicyEngineForScope": false,
          "oidcMayActScript": "[Empty]",
          "oidcClaimsScript": "36863ffb-40ec-48b9-94b1-9a99f71cc3b5",
          "overrideableOIDCClaims": [],
          "accessTokenModificationPluginType": "SCRIPTED",
          "accessTokenMayActScript": "[Empty]",
          "evaluateScopeScript": "[Empty]",
          "clientsCanSkipConsent": true,
          "accessTokenModificationScript": "e24385ea-a00e-4c9f-8eda-4f61e752dfb7",
          "oidcClaimsPluginType": "SCRIPTED",
          "providerOverridesEnabled": true,
          "issueRefreshTokenOnRefreshedToken": false,
          "authorizeEndpointDataProviderScript": "[Empty]",
          "validateScopeScript": "[Empty]",
          "statelessTokensEnabled": true
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
                  "http://localhost:8090",
                  "https://test-harness-chs-webapp.amido.aws.chdev.org",
                  "https://test-harness-chs-webapp.amido.aws.chdev.org:443"
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
                  "https://test-harness-chs-webapp.amido.aws.chdev.org/redirect"
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

      let cookie ='dd8758f44f45905=' + tokenId + ';';

       let oauthClientRequest = {
         'url': 'https://openam-companieshouse-uk-dev.id.forgerock.io/am/json/realms/root/realms/alpha/realm-config/agents/OAuth2Client/'+clientId,
         'method': 'PUT',
         'headers': {
           'Content-Type': 'application/json',
           'cookie': cookie,
           'accept-api-version': 'protocol=2.1,resource=1.0'
         },
         'body': JSON.stringify(oauthClientBody)
       };

     openidm.action('external/rest', 'call', oauthClientRequest);

     return {'result':'success'}


  }());

