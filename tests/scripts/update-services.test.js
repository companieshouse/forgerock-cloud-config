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

  const updateServices = require('../../scripts/update-services/update-services')

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    sessionToken: 'session=1234',
    realm: '/realms/root/realms/alpha'
  }

  const mockPhase0ConfigFile = path.resolve(
    __dirname,
    '../../config/phase-0/services/oauth2-provider.json'
  )
  const mockPhase1ConfigFile1 = path.resolve(
    __dirname,
    '../../config/phase-1/services/oauth2-provider.json'
  )
  const mockPhase1ConfigFile2 = path.resolve(
    __dirname,
    '../../config/phase-1/services/self-service.json'
  )

  const mockPhase0Config = {
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

  const mockPhase1Config = {
    _id: 'oauth-oidc-new',
    _type: {
      _id: 'oauth-oidc-new',
      name: 'OAuth2 Provider New'
    },
    advancedOAuth2Config: {
      customLoginUrlTemplate: 'https://ch-account-ui.gov.uk/account/login/',
      passwordGrantAuthService: 'PasswordGrant',
      tlsCertificateBoundAccessTokensEnabled: true
    },
    clientDynamicRegistrationConfig: {
      allowDynamicRegistration: true
    },
    consent: {
      clientsCanSkipConsent: false,
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
    delete process.env.PHASE
    fs.readdirSync.mockReturnValue(['oauth2-provider.json'])
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
    await updateServices(mockValues)
    expect(console.error).toHaveBeenCalledWith(
      'Missing FIDC_URL environment variable'
    )
    expect(process.exit).toHaveBeenCalledWith(1)
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

  it('should call API with phase 0 config by default', async () => {
    expect.assertions(2)
    const expectedUrl = `${mockValues.fidcUrl}/am/json${mockValues.realm}/realm-config/services/${mockPhase0Config._id}`
    await updateServices(mockValues)
    expect(fidcRequest.mock.calls.length).toEqual(1)
    expect(fidcRequest).toHaveBeenCalledWith(
      expectedUrl,
      mockPhase0Config,
      mockValues.sessionToken,
      true
    )
  })

  it('should call API with phase config by environment variable', async () => {
    expect.assertions(2)
    process.env.PHASE = 1
    fs.readdirSync.mockReturnValue([
      'oauth2-provider.json',
      'self-service.json'
    ])
    const expectedUrl = `${mockValues.fidcUrl}/am/json${mockValues.realm}/realm-config/services/${mockPhase1Config._id}`
    await updateServices(mockValues)
    expect(fidcRequest.mock.calls.length).toEqual(2)
    expect(fidcRequest).toHaveBeenCalledWith(
      expectedUrl,
      mockPhase1Config,
      mockValues.sessionToken,
      true
    )
  })

  it('should call update the url if the realm is changed', async () => {
    expect.assertions(2)
    const updatedRealm = '/realms/root/realms/bravo'
    mockValues.realm = updatedRealm
    const expectedUrl = `${mockValues.fidcUrl}/am/json${updatedRealm}/realm-config/services/${mockPhase0Config._id}`
    await updateServices(mockValues)
    expect(fidcRequest.mock.calls.length).toEqual(1)
    expect(fidcRequest).toHaveBeenCalledWith(
      expectedUrl,
      mockPhase0Config,
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
