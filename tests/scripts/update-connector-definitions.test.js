describe('update-connector-definitions', () => {
  jest.mock('fs')
  const fs = require('fs')
  const path = require('path')
  jest.mock('../../helpers/get-access-token')
  const getAccessToken = require('../../helpers/get-access-token')
  jest.mock('../../helpers/fidc-request')
  const fidcRequest = require('../../helpers/fidc-request')
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(process, 'exit').mockImplementation(() => {})

  const updateConnectorDefinitions = require('../../scripts/update-connector-definitions')

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    accessToken: 'forgerock-token'
  }

  const mockConfigFile = path.resolve(
    __dirname,
    '../../config/connectors/definitions/mongodb.json'
  )

  const mockConfig = {
    _id: 'MongoDB',
    connectorRef: {
      connectorHostRef: 'mongodb',
      displayName: 'MongoDB Connector',
      bundleVersion: '1.5.19.1'
    },
    poolConfigOption: {
      maxObjects: 10
    },
    configurationProperties: {
      createScriptFileName: 'Create.groovy',
      scriptExtensions: 'groovy',
      deleteScriptFileName: 'Delete.groovy',
      searchScriptFileName: 'Search.groovy',
      updateScriptFileName: 'Update.groovy',
      schemaScriptFileName: 'Schema.groovy',
      syncScriptFileName: 'Sync.groovy',
      userDatabase: 'admin',
      database: 'users'
    },
    enabled: true
  }

  beforeEach(() => {
    fidcRequest.mockImplementation(() => Promise.resolve())
    getAccessToken.mockImplementation(() =>
      Promise.resolve(mockValues.accessToken)
    )
    process.env.FIDC_URL = mockValues.fidcUrl
    fs.readdirSync.mockReturnValue(['mongodb.json'])
    jest.mock(mockConfigFile, () => mockConfig, { virtual: true })
  })

  afterEach(() => {
    jest.resetAllMocks()
    console.log.mockClear()
    console.error.mockClear()
    process.exit.mockClear()
  })

  afterAll(() => {
    console.log.mockRestore()
    console.error.mockRestore()
    process.exit.mockRestore()
  })

  it('should error if getAccessToken functions fails', async () => {
    expect.assertions(2)
    const errorMessage = 'Invalid user'
    getAccessToken.mockImplementation(() =>
      Promise.reject(new Error(errorMessage))
    )
    await updateConnectorDefinitions(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should call API with config file', async () => {
    expect.assertions(2)
    const expectedUrl = `${mockValues.fidcUrl}/openidm/config/${mockConfig._id}`
    await updateConnectorDefinitions(mockValues)
    expect(fidcRequest.mock.calls.length).toEqual(1)
    expect(fidcRequest).toHaveBeenCalledWith(
      expectedUrl,
      mockConfig,
      mockValues.accessToken
    )
  })

  it('should error if API request fails', async () => {
    expect.assertions(2)
    const errorMessage = 'testing request failed'
    fidcRequest.mockImplementation(() =>
      Promise.reject(new Error(errorMessage))
    )
    await updateConnectorDefinitions(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })
})
