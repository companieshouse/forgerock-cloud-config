const newman = require('newman')

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
          'Authentication to Top-Level Realm',
          'Authenticate as ID Cloud Admin and Get Session Token, and Cookie Name'
        ],
        hideResponseBody: [
          'Access Token',
          'Session Token',
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
