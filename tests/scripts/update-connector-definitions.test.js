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

  const mockPhase0ConfigFile = path.resolve(
    __dirname,
    '../../config/phase-0/connectors/definitions/mongodb.json'
  )
  const mockPhase1ConfigFile1 = path.resolve(
    __dirname,
    '../../config/phase-1/connectors/definitions/mongodb.json'
  )
  const mockPhase1ConfigFile2 = path.resolve(
    __dirname,
    '../../config/phase-1/connectors/definitions/oracle.json'
  )

  const mockPhase0Config = {
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

  const mockPhase1Config = {
    _id: 'MongoDB2',
    connectorRef: {
      connectorHostRef: 'mongodb',
      displayName: 'MongoDB Connector',
      bundleVersion: '1.6.0.0'
    },
    poolConfigOption: {
      maxObjects: 20
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
      database: 'companies'
    },
    enabled: true
  }

  beforeEach(() => {
    fidcRequest.mockImplementation(() => Promise.resolve())
    getAccessToken.mockImplementation(() =>
      Promise.resolve(mockValues.accessToken)
    )
    process.env.FIDC_URL = mockValues.fidcUrl
    delete process.env.PHASE
    fs.readdirSync.mockReturnValue(['mongodb.json'])
    jest.mock(mockPhase0ConfigFile, () => mockPhase0Config, { virtual: true })
    jest.mock(mockPhase1ConfigFile1, () => mockPhase1Config, { virtual: true })
    jest.mock(mockPhase1ConfigFile2, () => mockPhase1Config, { virtual: true })
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

  it('should call API with phase 0 config by default', async () => {
    expect.assertions(2)
    const expectedUrl = `${mockValues.fidcUrl}/openidm/config/${mockPhase0Config._id}`
    await updateConnectorDefinitions(mockValues)
    expect(fidcRequest.mock.calls.length).toEqual(1)
    expect(fidcRequest).toHaveBeenCalledWith(
      expectedUrl,
      mockPhase0Config,
      mockValues.accessToken
    )
  })

  it('should call API with phase config by environment variable', async () => {
    expect.assertions(2)
    process.env.PHASE = 1
    fs.readdirSync.mockReturnValue(['mongodb.json', 'oracle.json'])
    const expectedUrl = `${mockValues.fidcUrl}/openidm/config/${mockPhase1Config._id}`
    await updateConnectorDefinitions(mockValues)
    expect(fidcRequest.mock.calls.length).toEqual(2)
    expect(fidcRequest.mock.calls[0]).toEqual([
      expectedUrl,
      mockPhase1Config,
      mockValues.accessToken
    ])
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
