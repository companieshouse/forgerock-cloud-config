describe('update-am-scripts', () => {
  jest.mock('fs')
  const fs = require('fs')
  const path = require('path')
  jest.mock('../../helpers/get-session-token')
  const getSessionToken = require('../../helpers/get-session-token')
  jest.mock('../../helpers/fidc-request')
  const fidcRequest = require('../../helpers/fidc-request')
  const updateScripts = require('../../scripts/update-scripts')
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(process, 'exit').mockImplementation(() => {})

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    sessionToken: 'session=1234',
    realm: 'alpha'
  }

  const mockConfigFile = path.resolve(
    __dirname,
    '../../config/am-scripts/scripts-config.json'
  )

  const mockConfig = {
    scripts: [
      {
        payload: {
          _id: 'abcd',
          name: 'Script 1',
          description: 'Script 1',
          script: '<base64encoding>',
          language: 'JAVASCRIPT',
          context: 'AUTHENTICATION_TREE_DECISION_NODE',
          createdBy: 'id=amadmin,ou=user,dc=openam,dc=forgerock,dc=org',
          creationDate: 1436807766258,
          lastModifiedBy: 'id=amadmin,ou=user,dc=openam,dc=forgerock,dc=org',
          lastModifiedDate: 1436807766258
        },
        filename: 'filename.js'
      }
    ]
  }

  beforeEach(() => {
    fidcRequest.mockImplementation(() => Promise.resolve())
    getSessionToken.mockImplementation(() =>
      Promise.resolve(mockValues.sessionToken)
    )

    process.env.FIDC_URL = mockValues.fidcUrl
    fs.readdirSync.mockReturnValue(['scripts-config.json'])
    fs.readFileSync.mockReturnValue('<base64encoding>')
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
    await updateScripts(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should call API using config file', async () => {
    expect.assertions(2)
    const expectedUrl = `${mockValues.fidcUrl}/am/json/realms/root/realms/${mockValues.realm}/scripts/${mockConfig.scripts[0].payload._id}`
    const expectedBody = mockConfig.scripts[0].payload
    await updateScripts(mockValues)
    expect(fidcRequest.mock.calls.length).toEqual(1)
    expect(fidcRequest).toHaveBeenCalledWith(
      expectedUrl,
      expectedBody,
      mockValues.sessionToken,
      true
    )
  })

  it('should error if API request fails', async () => {
    const errorMessage = 'testing request failed'
    fidcRequest.mockImplementation(() =>
      Promise.reject(new Error(errorMessage))
    )
    await updateScripts(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })
})
