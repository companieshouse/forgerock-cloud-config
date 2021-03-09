describe('update-applications', () => {
  jest.mock('fs')
  const fs = require('fs')
  const path = require('path')
  jest.mock('../../helpers/get-session-token')
  const getSessionToken = require('../../helpers/get-session-token')
  jest.mock('../../helpers/fidc-request')
  const fidcRequest = require('../../helpers/fidc-request')
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(process, 'exit').mockImplementation(() => {})

  const updateApplications = require('../../scripts/update-applications')

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    sessionToken: 'session=1234',
    realm: 'alpha'
  }

  const mockConfigFile = path.resolve(
    __dirname,
    '../../config/applications/sdk-client.json'
  )

  const mockConfig = {
    _id: 'SDKClient',
    coreOAuth2ClientConfig: {
      scopes: {
        inherited: false,
        value: ['openid', 'fr:idm:*']
      },
      status: {
        inherited: false,
        value: 'Active'
      },
      redirectionUris: {
        inherited: false,
        value: ['http://localhost:3000']
      }
    },
    advancedOAuth2ClientConfig: {
      responseTypes: {
        inherited: false,
        value: ['code', 'token', 'id_token']
      },
      javascriptOrigins: {
        inherited: false,
        value: ['http://localhost:3000']
      }
    }
  }

  beforeEach(() => {
    getSessionToken.mockImplementation(() =>
      Promise.resolve(mockValues.sessionToken)
    )
    fidcRequest.mockImplementation(() => Promise.resolve())
    process.env.FIDC_URL = mockValues.fidcUrl
    fs.readdirSync.mockReturnValue(['sdk-client.json'])
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

  it('should error if getSessionToken functions fails', async () => {
    expect.assertions(2)
    const errorMessage = 'Invalid user'
    getSessionToken.mockImplementation(() =>
      Promise.reject(new Error(errorMessage))
    )
    await updateApplications(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should error if fidcRequest function fails', async () => {
    expect.assertions(2)
    const errorMessage = 'Forbidden'
    fidcRequest.mockImplementation(() =>
      Promise.reject(new Error(errorMessage))
    )
    await updateApplications(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should call API with using config file', async () => {
    expect.assertions(2)
    const expectedUrl = `${mockValues.fidcUrl}/am/json/realms/root/realms/${mockValues.realm}/realm-config/agents/OAuth2Client/${mockConfig._id}`
    await updateApplications(mockValues)
    expect(fidcRequest.mock.calls.length).toEqual(1)
    expect(fidcRequest.mock.calls[0]).toEqual([
      expectedUrl,
      mockConfig,
      mockValues.sessionToken,
      true
    ])
  })

  it('should call update the url if the realm is changed', async () => {
    expect.assertions(2)
    const updatedRealm = 'bravo'
    mockValues.realm = updatedRealm
    const expectedUrl = `${mockValues.fidcUrl}/am/json/realms/root/realms/${updatedRealm}/realm-config/agents/OAuth2Client/${mockConfig._id}`
    await updateApplications(mockValues)
    expect(fidcRequest.mock.calls.length).toEqual(1)
    expect(fidcRequest.mock.calls[0]).toEqual([
      expectedUrl,
      mockConfig,
      mockValues.sessionToken,
      true
    ])
  })
})
