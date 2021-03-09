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

  const mockPhase0ConfigFile = path.resolve(
    __dirname,
    '../../config/phase-0/applications/sdk-client.json'
  )
  const mockPhase1ConfigFile1 = path.resolve(
    __dirname,
    '../../config/phase-1/applications/sdk-client.json'
  )
  const mockPhase1ConfigFile2 = path.resolve(
    __dirname,
    '../../config/phase-1/applications/rsc-client.json'
  )

  const mockPhase0Config = {
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

  const mockPhase1Config = {
    _id: 'RSCClient',
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
        value: ['http://localhost:3001']
      }
    },
    advancedOAuth2ClientConfig: {
      responseTypes: {
        inherited: false,
        value: ['code', 'token', 'id_token']
      },
      javascriptOrigins: {
        inherited: false,
        value: ['http://localhost:3001']
      }
    }
  }

  beforeEach(() => {
    getSessionToken.mockImplementation(() =>
      Promise.resolve(mockValues.sessionToken)
    )
    fidcRequest.mockImplementation(() => Promise.resolve())
    process.env.FIDC_URL = mockValues.fidcUrl
    delete process.env.PHASE
    fs.readdirSync.mockReturnValue(['sdk-client.json'])
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

  it('should call API with phase 0 config by default', async () => {
    expect.assertions(2)
    const expectedUrl = `${mockValues.fidcUrl}/am/json/realms/root/realms/${mockValues.realm}/realm-config/agents/OAuth2Client/${mockPhase0Config._id}`
    await updateApplications(mockValues)
    expect(fidcRequest.mock.calls.length).toEqual(1)
    expect(fidcRequest.mock.calls[0]).toEqual([
      expectedUrl,
      mockPhase0Config,
      mockValues.sessionToken,
      true
    ])
  })

  it('should call API with phase config by environment variable', async () => {
    expect.assertions(2)
    process.env.PHASE = 1
    fs.readdirSync.mockReturnValue(['sdk-client.json', 'rsc-client.json'])
    const expectedUrl = `${mockValues.fidcUrl}/am/json/realms/root/realms/${mockValues.realm}/realm-config/agents/OAuth2Client/${mockPhase1Config._id}`
    await updateApplications(mockValues)
    expect(fidcRequest.mock.calls.length).toEqual(2)
    expect(fidcRequest.mock.calls[0]).toEqual([
      expectedUrl,
      mockPhase1Config,
      mockValues.sessionToken,
      true
    ])
  })

  it('should call update the url if the realm is changed', async () => {
    expect.assertions(2)
    const updatedRealm = 'bravo'
    mockValues.realm = updatedRealm
    const expectedUrl = `${mockValues.fidcUrl}/am/json/realms/root/realms/${updatedRealm}/realm-config/agents/OAuth2Client/${mockPhase0Config._id}`
    await updateApplications(mockValues)
    expect(fidcRequest.mock.calls.length).toEqual(1)
    expect(fidcRequest.mock.calls[0]).toEqual([
      expectedUrl,
      mockPhase0Config,
      mockValues.sessionToken,
      true
    ])
  })
})
