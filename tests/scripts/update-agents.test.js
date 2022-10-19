describe('update-agents', () => {
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

  const updateAgents = require('../../scripts/update-agents')

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    sessionToken: 'session=1234',
    realm: 'alpha'
  }

  const mockConfigFile = path.resolve(
    __dirname,
    '../../config/agents/ig-agent.json'
  )

  // const mockConfigFile2 = path.resolve(
  //   __dirname,
  //   '../../config/agents/remote-consent-agent.json'
  // )

  const mockConfig = {
    _id: 'ig_agent',
    _type: {
      _id: 'IdentityGatewayAgent'
    },
    igTokenIntrospection: 'Realm_Subs',
    userpassword: 'password',
    status: 'Active',
    igCdssoRedirectUrls: []
  }

  // const mockConfig2 = {
  //   _id: 'journey-rcs',
  //   _type: {
  //     _id: 'RemoteConsentAgent'
  //   },
  //   igTokenIntrospection: 'Realm_Subs',
  //   userpassword: 'password',
  //   status: 'Active',
  //   igCdssoRedirectUrls: []
  // }

  beforeEach(() => {
    getSessionToken.mockImplementation(() =>
      Promise.resolve(mockValues.sessionToken)
    )
    fidcRequest.mockImplementation(() => Promise.resolve())
    replaceSensitiveValues.mockImplementation(() => Promise.resolve())
    process.env.FIDC_URL = mockValues.fidcUrl
    fs.readdirSync.mockReturnValue(['ig-agent.json', 'remote-consent-agent.json'])
    jest.mock(mockConfigFile, () => mockConfig, { virtual: true })
    // jest.mock(mockConfigFile2, () => mockConfig2, { virtual: true })
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
    await updateAgents(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should error if replaceSensitiveValues function fails', async () => {
    expect.assertions(2)
    const errorMessage = 'File not found'
    replaceSensitiveValues.mockImplementation(() =>
      Promise.reject(new Error(errorMessage))
    )
    await updateAgents(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  // it('should error if fidcRequest function fails', async () => {
  //   expect.assertions(2)
  //   const errorMessage = 'Forbidden'
  //   fidcRequest.mockImplementation(() =>
  //     Promise.reject(new Error(errorMessage))
  //   )
  //   await updateAgents(mockValues)
  //   expect(console.error).toHaveBeenCalledWith(errorMessage)
  //   expect(process.exit).toHaveBeenCalledWith(1)
  // })

  // it('should call API with using config file', async () => {
  //   expect.assertions(3)
  //   const expectedUrl = `${mockValues.fidcUrl}/am/json/realms/root/realms/${mockValues.realm}/realm-config/agents/IdentityGatewayAgent/ig_agent`
  //   console.log(expectedUrl)
  //   const expectedUrl2 = `${mockValues.fidcUrl}/am/json/realms/root/realms/${mockValues.realm}/realm-config/agents/RemoteConsentAgent/journey-rcs`
  //   await updateAgents(mockValues)
  //   expect(fidcRequest.mock.calls.length).toEqual(2)
  //   expect(fidcRequest.mock.calls[0]).toEqual([
  //     expectedUrl,
  //     mockConfig,
  //     mockValues.sessionToken,
  //     true
  //   ])
  //   expect(fidcRequest.mock.calls[1]).toEqual([
  //     expectedUrl2,
  //     mockConfig2,
  //     mockValues.sessionToken,
  //     true
  //   ])

  // })

  // it('should call update the url if the realm is changed', async () => {
  //   expect.assertions(2)
  //   const updatedRealm = 'bravo'
  //   mockValues.realm = updatedRealm
  //   const expectedUrl = `${mockValues.fidcUrl}/am/json/realms/root/realms/${updatedRealm}/realm-config/agents/IdentityGatewayAgent/${mockConfig._id}`
  //   await updateAgents(mockValues)
  //   expect(fidcRequest.mock.calls.length).toEqual(1)
  //   expect(fidcRequest.mock.calls[0]).toEqual([
  //     expectedUrl,
  //     mockConfig,
  //     mockValues.sessionToken,
  //     true
  //   ])
  // })
})
