describe('update-connector-definitions', () => {
  jest.mock('node-fetch')
  const fetch = require('node-fetch')
  jest.mock('fs')
  const fs = require('fs')
  const path = require('path')
  jest.mock('../../helpers/get-access-token')
  const getAccessToken = require('../../helpers/get-access-token')
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(process, 'exit').mockImplementation(() => {})

  const updateConnectorDefinitions = require('../../scripts/update-connectors/update-connector-definitions')

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
    fetch.mockImplementation(() =>
      Promise.resolve({
        status: 200,
        statusText: 'OK'
      })
    )
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

  it('should error if missing FIDC_URL environment variable', async () => {
    expect.assertions(2)
    delete process.env.FIDC_URL
    await updateConnectorDefinitions(mockValues)
    expect(console.error).toHaveBeenCalledWith(
      'Missing FIDC_URL environment variable'
    )
    expect(process.exit).toHaveBeenCalledWith(1)
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
    const expectedUrl = `${mockValues.fidcUrl}/openidm/config/provisioner.openicf/${mockPhase0Config._id}`
    const expectedApiOptions = {
      method: 'put',
      headers: {
        authorization: `Bearer ${mockValues.accessToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(mockPhase0Config)
    }
    await updateConnectorDefinitions(mockValues)
    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedApiOptions)
  })

  it('should call API with phase config by environment variable', async () => {
    process.env.PHASE = 1
    fs.readdirSync.mockReturnValue(['mongodb.json', 'oracle.json'])
    const expectedUrl = `${mockValues.fidcUrl}/openidm/config/provisioner.openicf/${mockPhase1Config._id}`
    const expectedApiOptions = {
      method: 'put',
      headers: {
        authorization: `Bearer ${mockValues.accessToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(mockPhase1Config)
    }
    await updateConnectorDefinitions(mockValues)
    expect(fetch.mock.calls.length).toEqual(2)
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedApiOptions)
  })

  it('should error if API request fails', async () => {
    const errorMessage = 'testing request failed'
    fetch.mockImplementation(() => Promise.reject(new Error(errorMessage)))
    await updateConnectorDefinitions(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should error if API response is not 200', async () => {
    fetch.mockImplementation(() =>
      Promise.resolve({
        status: 401,
        statusText: 'Unauthorized'
      })
    )
    await updateConnectorDefinitions(mockValues)
    expect(console.error).toHaveBeenCalledWith('401: Unauthorized')
    expect(process.exit).toHaveBeenCalledWith(1)
  })
})
