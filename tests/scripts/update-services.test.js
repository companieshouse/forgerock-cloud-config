describe('update-services', () => {
  jest.mock('fs')
  const fs = require('fs')
  const path = require('path')
  jest.mock('../../helpers/get-session-token')
  const getSessionToken = require('../../helpers/get-session-token')
  jest.mock('../../helpers/fidc-request')
  const fidcRequest = require('../../helpers/fidc-request')
  jest.mock('../../helpers/replace-sensitive-values')
  const replaceSensitiveValues = require('../../helpers/replace-sensitive-values')
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(process, 'exit').mockImplementation(() => {})

  const updateServices = require('../../scripts/update-services')

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    sessionToken: 'session=1234',
    realm: 'alpha'
  }

  const mockConfigFile = path.resolve(
    __dirname,
    '../../config/services/oauth2-provider.json'
  )

  const mockConfig = {
    _id: 'oauth-oidc',
    _type: {
      _id: 'oauth-oidc',
      name: 'OAuth2 Provider'
    },
    advancedOAuth2Config: {
      customLoginUrlTemplate: 'https://ch-account-ui.gov.uk/account/login/',
      passwordGrantAuthService: 'PasswordGrant',
      tlsCertificateBoundAccessTokensEnabled: true
    },
    clientDynamicRegistrationConfig: {
      allowDynamicRegistration: false
    },
    consent: {
      clientsCanSkipConsent: true,
      enableRemoteConsent: false
    }
  }

  beforeEach(() => {
    fidcRequest.mockImplementation(() => Promise.resolve())
    getSessionToken.mockImplementation(() =>
      Promise.resolve(mockValues.sessionToken)
    )
    replaceSensitiveValues.mockImplementation(() => Promise.resolve())
    process.env.FIDC_URL = mockValues.fidcUrl
    fs.readdirSync.mockReturnValue(['oauth2-provider.json'])
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

  it('should error if getSessionToken function fails', async () => {
    expect.assertions(2)
    const errorMessage = 'Invalid user'
    getSessionToken.mockImplementation(() =>
      Promise.reject(new Error(errorMessage))
    )
    await updateServices(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should error if replaceSensitiveValues function fails', async () => {
    expect.assertions(2)
    const errorMessage = 'File not found'
    replaceSensitiveValues.mockImplementation(() =>
      Promise.reject(new Error(errorMessage))
    )
    await updateServices(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should call API using config file', async () => {
    expect.assertions(2)
    const expectedUrl = `${mockValues.fidcUrl}/am/json/realms/root/realms/${mockValues.realm}/realm-config/services/${mockConfig._id}`
    await updateServices(mockValues)
    expect(fidcRequest.mock.calls.length).toEqual(1)
    expect(fidcRequest).toHaveBeenCalledWith(
      expectedUrl,
      mockConfig,
      mockValues.sessionToken,
      true
    )
  })

  it('should call update the url if the realm is changed', async () => {
    expect.assertions(2)
    const updatedRealm = 'bravo'
    mockValues.realm = updatedRealm
    const expectedUrl = `${mockValues.fidcUrl}/am/json/realms/root/realms/${updatedRealm}/realm-config/services/${mockConfig._id}`
    await updateServices(mockValues)
    expect(fidcRequest.mock.calls.length).toEqual(1)
    expect(fidcRequest).toHaveBeenCalledWith(
      expectedUrl,
      mockConfig,
      mockValues.sessionToken,
      true
    )
  })

  it('should error if API request fails', async () => {
    expect.assertions(2)
    const errorMessage = 'testing request failed'
    fidcRequest.mockImplementation(() =>
      Promise.reject(new Error(errorMessage))
    )
    await updateServices(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })
})
