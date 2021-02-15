describe('update-connector-mappings', () => {
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

  const updateConnectorMappings = require('../../scripts/update-connectors/update-connector-mappings')

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    accessToken: 'forgerock-token'
  }

  const mockPhase0ConfigFile = path.resolve(
    __dirname,
    '../../config/phase-0/connectors/mappings/mongodb-users.json'
  )
  const mockPhase1ConfigFile1 = path.resolve(
    __dirname,
    '../../config/phase-1/connectors/mappings/mongodb-users.json'
  )
  const mockPhase1ConfigFile2 = path.resolve(
    __dirname,
    '../../config/phase-1/connectors/mappings/oracle-users.json'
  )

  const mockPhase0Config = {
    consentRequired: false,
    displayName: 'MongodbUsers',
    icon: null,
    name: 'MongodbUsers',
    properties: [
      {
        source: 'email',
        target: 'mail'
      },
      {
        source: 'email',
        target: 'userName'
      },
      {
        source: 'forename',
        target: 'givenName'
      },
      {
        source: 'surname',
        target: 'sn'
      }
    ]
  }

  const mockPhase1Config = {
    consentRequired: true,
    displayName: 'MongodbUsers',
    icon: null,
    name: 'MongodbUsers',
    properties: [
      {
        source: 'email',
        target: 'mail'
      },
      {
        source: 'username',
        target: 'userName'
      },
      {
        source: 'name',
        target: 'name'
      }
    ]
  }

  const expectedUrl = `${mockValues.fidcUrl}/openidm/config/sync`

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
    fs.readdirSync.mockReturnValue(['mongodb-users.json'])
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
    await updateConnectorMappings(mockValues)
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
    await updateConnectorMappings(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should call API with phase 0 config by default', async () => {
    expect.assertions(2)
    const expectedApiOptions = {
      method: 'put',
      headers: {
        authorization: `Bearer ${mockValues.accessToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ mappings: [mockPhase0Config] })
    }
    await updateConnectorMappings(mockValues)
    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedApiOptions)
  })

  it('should call API with phase config by environment variable', async () => {
    process.env.PHASE = 1
    fs.readdirSync.mockReturnValue(['mongodb-users.json', 'oracle-users.json'])
    const expectedApiOptions = {
      method: 'put',
      headers: {
        authorization: `Bearer ${mockValues.accessToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ mappings: [mockPhase1Config, mockPhase1Config] })
    }
    await updateConnectorMappings(mockValues)
    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedApiOptions)
  })

  it('should error if API request fails', async () => {
    const errorMessage = 'testing request failed'
    fetch.mockImplementation(() => Promise.reject(new Error(errorMessage)))
    await updateConnectorMappings(mockValues)
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
    await updateConnectorMappings(mockValues)
    expect(console.error).toHaveBeenCalledWith('401: Unauthorized')
    expect(process.exit).toHaveBeenCalledWith(1)
  })
})
