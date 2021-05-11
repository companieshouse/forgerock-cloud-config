const newman = require('newman')
const replaceSensitiveValues = require('../helpers/replace-sensitive-values')

const testRunner = async () => {
  const {
    PLATFORM_URL,
    CLIENT_ID,
    IDM_USERNAME,
    IDM_PASSWORD,
    REALM,
    ID_CLOUD_ADMIN_USERNAME,
    ID_CLOUD_ADMIN_PASSWORD,
    COOKIE,
    VERSION
  } = process.env

  await replaceSensitiveValues(
    __dirname,
    [
      '{REPLACEMENT_PLATFORM_URL}',
      '{REPLACEMENT_CLIENT_ID}',
      '{REPLACEMENT_IDM_USERNAME}',
      '{REPLACEMENT_IDM_PASSWORD}',
      '{REPLACEMENT_REALM}',
      '{REPLACEMENT_ID_CLOUD_ADMIN_USERNAME}',
      '{REPLACEMENT_ID_CLOUD_ADMIN_PASSWORD}',
      '{REPLACEMENT_COOKIE}',
      '{REPLACEMENT_VERSION}'
    ],
    [
      PLATFORM_URL,
      CLIENT_ID,
      IDM_USERNAME,
      IDM_PASSWORD,
      REALM,
      ID_CLOUD_ADMIN_USERNAME,
      ID_CLOUD_ADMIN_PASSWORD,
      COOKIE,
      VERSION
    ]
  )

  newman.run(
    {
      collection: 'qa-tests/TestCollection.postman_collection.json',
      environment: 'qa-tests/env.postman_environment.json',
      reporters: ['htmlextra'],
      iterationCount: 1,
      reporter: {
        htmlextra: {
          export: 'qa-tests/Reports/fidc-config-tests-report.html',
          // template: './template.hbs'
          logs: true,
          // showOnlyFails: true,
          // noSyntaxHighlighting: true,
          // testPaging: true,
          browserTitle: 'FR Config Tests',
          title: 'FR Configurations Test Report',
          titleSize: 6,
          // omitHeaders: true,
          skipHeaders: ['Authorization', 'cookie'],
          hideRequestBody: [
            'Access Token',
            'Session Token',
            'Skip MFA Set up',
            'Authentication to Top-Level Realm',
            'Authenticate as ID Cloud Admin and Get Session Token, and Cookie Name'
          ],
          hideResponseBody: [
            'Access Token',
            'Session Token',
            'Skip MFA Set up',
            'CHSUser Connector',
            'CHSRoles Connector',
            'Authentication to Top-Level Realm',
            'Authenticate as ID Cloud Admin and Get Session Token, and Cookie Name'
          ],
          showEnvironmentData: true,
          skipEnvironmentVars: [
            'access_token',
            'ClientId',
            'ClientSecret',
            'session_token',
            'cookie_Name',
            'cookie_Name',
            'IDCloudAdminUsername',
            'IDCloudAdminPassword',
            'username',
            'password',
            'utils'
          ],
          showGlobalData: false
          // skipGlobalVars: ["API_TOKEN"],
          // skipSensitiveData: true,
          // showMarkdownLinks: true,
          // showFolderDescription: true,
          // timezone: "Australia/Sydney"
        }
      }
    },
    function (err, summary) {
      if (err || summary.run.error || summary.run.failures.length) {
        process.exit(1)
      }
    }
  )
}

testRunner()
