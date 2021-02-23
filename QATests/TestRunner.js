
const newman = require('newman')

const envs = process.argv.slice(2)
const environment = envs[0]

switch (environment) {
  case 'dev':

    newman.run({
      collection: 'QATests\\FR Configuration test.postman_collection.json',
      environment: 'QATests\\FR_Dev.postman_environment.json',
      reporters: ['htmlextra'],
      iterationCount: 1,
      reporter: {
        htmlextra: {
          export: 'QATests\\Reports\\FR Congiurations Test Report- ' + environment + ' ' + Date.now() + ' .html',
          // template: './template.hbs'
          logs: true,
          // showOnlyFails: true,
          // noSyntaxHighlighting: true,
          // testPaging: true,
          browserTitle: 'Config Tests - Dev',
          title: 'FR Configurations Test Report -Dev',
          titleSize: 6,
          // omitHeaders: true,
          skipHeaders: ['Authorization', 'cookie'],
          hideRequestBody: ['Access Token', 'Session Token', 'Authentication to Top-Level Realm', 'Authenticate as ID Cloud Admin and Get Session Token, and Cookie Name'],
          hideResponseBody: ['Access Token', 'Session Token', 'Authentication to Top-Level Realm', 'Authenticate as ID Cloud Admin and Get Session Token, and Cookie Name'],
          showEnvironmentData: true,
          skipEnvironmentVars: ['access_token', 'ClientId', 'ClientSecret', 'session_token', 'cookie_Name', 'cookie_Name', 'IDCloudAdminUsername', 'IDCloudAdminPassword', 'username', 'password'],
          showGlobalData: false
          // skipGlobalVars: ["API_TOKEN"],
          // skipSensitiveData: true,
          // showMarkdownLinks: true,
          // showFolderDescription: true,
          // timezone: "Australia/Sydney"
        }
      }
    })
    break
  case 'staging':
    console.log(environment)

    newman.run({
      collection: 'QATests\\FR Configuration test.postman_collection.json',
      environment: 'QATests\\FR_Dev.postman_environment.json',
      reporters: ['htmlextra'],
      iterationCount: 1,
      reporter: {
        htmlextra: {
          export: 'QATests\\Reports\\FR Congiurations Test Report- ' + environment + ' ' + Date.now() + ' .html',
          // template: './template.hbs'
          logs: true,
          // showOnlyFails: true,
          // noSyntaxHighlighting: true,
          // testPaging: true,
          browserTitle: 'Config Tests - Dev',
          title: 'FR Configurations Test Report -Dev',
          titleSize: 6,
          // omitHeaders: true,
          skipHeaders: ['Authorization', 'cookie'],
          hideRequestBody: ['Access Token', 'Session Token', 'Authentication to Top-Level Realm', 'Authenticate as ID Cloud Admin and Get Session Token, and Cookie Name'],
          hideResponseBody: ['Access Token', 'Session Token', 'Authentication to Top-Level Realm', 'Authenticate as ID Cloud Admin and Get Session Token, and Cookie Name'],
          showEnvironmentData: true,
          skipEnvironmentVars: ['access_token', 'ClientId', 'ClientSecret', 'session_token', 'cookie_Name', 'cookie_Name', 'IDCloudAdminUsername', 'IDCloudAdminPassword', 'username', 'password'],
          showGlobalData: false
          // skipGlobalVars: ["API_TOKEN"],
          // skipSensitiveData: true,
          // showMarkdownLinks: true,
          // showFolderDescription: true,
          // timezone: "Australia/Sydney"
        }
      }
    })
    break
  case 'production':

    newman.run({
      collection: 'QATests\\FR Configuration test.postman_collection.json',
      environment: 'QATests\\FR_Prod.postman_environment.json',
      reporters: ['htmlextra'],
      iterationCount: 1,
      reporter: {
        htmlextra: {
          export: 'QATests\\Reports\\FR Congiurations Test Report- ' + environment + ' ' + Date.now() + ' .html',
          // template: './template.hbs'
          logs: true,
          // showOnlyFails: true,
          // noSyntaxHighlighting: true,
          // testPaging: true,
          browserTitle: 'Config Tests - Dev',
          title: 'FR Configurations Test Report -Dev',
          titleSize: 6,
          // omitHeaders: true,
          skipHeaders: ['Authorization', 'cookie'],
          hideRequestBody: ['Access Token', 'Session Token', 'Authentication to Top-Level Realm', 'Authenticate as ID Cloud Admin and Get Session Token, and Cookie Name'],
          hideResponseBody: ['Access Token', 'Session Token', 'Authentication to Top-Level Realm', 'Authenticate as ID Cloud Admin and Get Session Token, and Cookie Name'],
          showEnvironmentData: false,
          skipEnvironmentVars: ['access_token', 'ClientId', 'ClientSecret', 'session_token', 'cookie_Name', 'cookie_Name', 'IDCloudAdminUsername', 'IDCloudAdminPassword', 'username', 'password'],
          showGlobalData: false
          // skipGlobalVars: ["API_TOKEN"],
          // skipSensitiveData: true,
          // showMarkdownLinks: true,
          // showFolderDescription: true,
          // timezone: "Australia/Sydney"
        }
      }
    })
    break
  default:
    console.log('Invalid Enviroment value supplied. options  => dev, stagaing, production')
}
