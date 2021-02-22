describe('update-applications', () => {
  jest.mock('node-fetch')
  const fetch = require('node-fetch')
  jest.mock('fs')
  const fs = require('fs')
  const path = require('path')
  jest.mock('../../helpers/get-session-token')
  const getSessionToken = require('../../helpers/get-session-token')
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(process, 'exit').mockImplementation(() => {})

  const updateApplications = require('../../scripts/update-applications/update-applications')

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    sessionToken: 'session=1234',
    realm: '/realms/root/realms/alpha'
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
    fetch.mockImplementation(() =>
      Promise.resolve({
        status: 200,
        statusText: 'OK'
      })
    )
    getSessionToken.mockImplementation(() =>
      Promise.resolve(mockValues.sessionToken)
    )
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

  it('should error if missing FIDC_URL environment variable', async () => {
    expect.assertions(2)
    delete process.env.FIDC_URL
    await updateApplications(mockValues)
    expect(console.error).toHaveBeenCalledWith(
      'Missing FIDC_URL environment variable'
    )
    expect(process.exit).toHaveBeenCalledWith(1)
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

  it('should call API with phase 0 config by default', async () => {
    expect.assertions(2)
    const expectedUrl = `${mockValues.fidcUrl}/am/json${mockValues.realm}/realm-config/agents/OAuth2Client/${mockPhase0Config._id}`
    const expectedApiOptions = {
      method: 'put',
      headers: {
        'content-type': 'application/json',
        'x-requested-with': 'ForgeRock CREST.js',
        cookie: mockValues.sessionToken
      },
      body: JSON.stringify(mockPhase0Config)
    }
    await updateApplications(mockValues)
    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedApiOptions)
  })

  it('should call API with phase config by environment variable', async () => {
    expect.assertions(2)
    process.env.PHASE = 1
    fs.readdirSync.mockReturnValue(['sdk-client.json', 'rsc-client.json'])
    const expectedUrl = `${mockValues.fidcUrl}/am/json${mockValues.realm}/realm-config/agents/OAuth2Client/${mockPhase1Config._id}`
    const expectedApiOptions = {
      method: 'put',
      headers: {
        'content-type': 'application/json',
        'x-requested-with': 'ForgeRock CREST.js',
        cookie: mockValues.sessionToken
      },
      body: JSON.stringify(mockPhase1Config)
    }
    await updateApplications(mockValues)
    expect(fetch.mock.calls.length).toEqual(2)
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedApiOptions)
  })

  it('should call update the url if the realm is changed', async () => {
    expect.assertions(2)
    const updatedRealm = '/realms/root/realms/bravo'
    mockValues.realm = updatedRealm
    const expectedUrl = `${mockValues.fidcUrl}/am/json${updatedRealm}/realm-config/agents/OAuth2Client/${mockPhase0Config._id}`
    const expectedApiOptions = {
      method: 'put',
      headers: {
        'content-type': 'application/json',
        'x-requested-with': 'ForgeRock CREST.js',
        cookie: mockValues.sessionToken
      },
      body: JSON.stringify(mockPhase0Config)
    }
    await updateApplications(mockValues)
    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedApiOptions)
  })

  it('should error if API request fails', async () => {
    expect.assertions(2)
    const errorMessage = 'testing request failed'
    fetch.mockImplementation(() => Promise.reject(new Error(errorMessage)))
    await updateApplications(mockValues)
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
    await updateApplications(mockValues)
    expect(console.error).toHaveBeenCalledWith('401: Unauthorized')
    expect(process.exit).toHaveBeenCalledWith(1)
  })
})