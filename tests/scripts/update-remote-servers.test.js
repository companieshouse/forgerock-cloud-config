describe('update-remote-servers', () => {
  const path = require('path')
  jest.mock('../../helpers/get-access-token')
  const getAccessToken = require('../../helpers/get-access-token')
  jest.mock('../../helpers/fidc-request')
  const fidcRequest = require('../../helpers/fidc-request')
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(process, 'exit').mockImplementation(() => {})

  const updateRemoteServers = require('../../scripts/update-remote-servers')

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    accessToken: 'forgerock-token'
  }

  const mockConfigFile = path.resolve(
    __dirname,
    '../../config/connectors/remote-servers.json'
  )

  const mockConfig = {
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
    fidcRequest.mockImplementation(() => Promise.resolve())
    getAccessToken.mockImplementation(() =>
      Promise.resolve(mockValues.accessToken)
    )
    process.env.FIDC_URL = mockValues.fidcUrl
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
    await updateRemoteServers(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should call API using config file', async () => {
    expect.assertions(2)
    await updateRemoteServers(mockValues)
    expect(fidcRequest.mock.calls.length).toEqual(1)
    expect(fidcRequest).toHaveBeenCalledWith(
      expectedUrl,
      mockConfig,
      mockValues.accessToken
    )
  })

  it('should error if API request fails', async () => {
    expect.assertions(2)
    const errorMessage = 'Something went wrong'
    fidcRequest.mockImplementation(() =>
      Promise.reject(new Error(errorMessage))
    )
    await updateRemoteServers(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })
})
