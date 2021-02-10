describe('update-remote-servers', () => {
  jest.mock('node-fetch')
  const fetch = require('node-fetch')
  const path = require('path')
  jest.mock('../../helpers/get-access-token')
  const getAccessToken = require('../../helpers/get-access-token')
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(process, 'exit').mockImplementation(() => {})

  const updateRemoteServers = require('../../scripts/update-connectors/update-remote-servers')

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    accessToken: 'forgerock-token'
  }

  const mockPhase0ConfigFile = path.resolve(
    __dirname,
    '../../config/phase-0/connectors/remote-servers.json'
  )
  const mockPhase1ConfigFile = path.resolve(
    __dirname,
    '../../config/phase-1/connectors/remote-servers.json'
  )

  const mockPhase0Config = {
    _id: 'provisioner.openicf.connectorinfoprovider',
    connectorsLocation: 'connectors',
    remoteConnectorClients: [
      {
        name: 'mongodb',
        displayName: 'mongodb',
        useSSL: false,
        enabled: false
      }
    ],
    remoteConnectorServers: [],
    remoteConnectorClientsGroups: [],
    remoteConnectorServersGroups: []
  }

  const mockPhase1Config = {
    _id: 'provisioner.openicf.connectorinfoprovider',
    connectorsLocation: 'connectors',
    remoteConnectorClients: [
      {
        name: 'mongodb',
        displayName: 'mongodb',
        useSSL: false,
        enabled: false
      }
    ],
    remoteConnectorServers: [],
    remoteConnectorClientsGroups: [],
    remoteConnectorServersGroups: []
  }

  const expectedUrl = `${mockValues.fidcUrl}/openidm/config/provisioner.openicf.connectorinfoprovider`

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
    jest.mock(mockPhase0ConfigFile, () => mockPhase0Config, { virtual: true })
    jest.mock(mockPhase1ConfigFile, () => mockPhase1Config, { virtual: true })
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

  it('should error if missing FRIC environment variable', async () => {
    expect.assertions(2)
    delete process.env.FIDC_URL
    await updateRemoteServers(mockValues)
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
    await updateRemoteServers(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should call API with phase 0 config by default', async () => {
    expect.assertions(2)
    const expectedApiOptions = {
      method: 'put',
      body: JSON.stringify(mockPhase0Config),
      headers: {
        authorization: `Bearer ${mockValues.accessToken}`,
        'content-type': 'application/json'
      }
    }
    await updateRemoteServers(mockValues)
    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedApiOptions)
  })

  it('should call API with phase config by environment variable', async () => {
    expect.assertions(2)
    process.env.PHASE = 1
    const expectedApiOptions = {
      method: 'put',
      body: JSON.stringify(mockPhase1Config),
      headers: {
        authorization: `Bearer ${mockValues.accessToken}`,
        'content-type': 'application/json'
      }
    }
    await updateRemoteServers(mockValues)
    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedApiOptions)
  })

  it('should error if API request fails', async () => {
    expect.assertions(2)
    const errorMessage = 'Something went wrong'
    fetch.mockImplementation(() => Promise.reject(new Error(errorMessage)))
    await updateRemoteServers(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should error if API response is not 200', async () => {
    expect.assertions(2)
    fetch.mockImplementation(() =>
      Promise.resolve({
        status: 401,
        statusText: 'Unauthorized'
      })
    )
    await updateRemoteServers(mockValues)
    expect(console.error).toHaveBeenCalledWith('401: Unauthorized')
    expect(process.exit).toHaveBeenCalledWith(1)
  })
})
