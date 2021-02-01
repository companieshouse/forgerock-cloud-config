describe('update-am-scripts', () => {
  jest.mock('node-fetch')
  const fetch = require('node-fetch')
  jest.mock('fs')
  const fs = require('fs')
  const path = require('path')
  jest.mock('../../helpers/get-session-token')
  const getSessionToken = require('../../helpers/get-session-token')
  const updateScripts = require('../../scripts/update-scripts/update-scripts')
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(process, 'exit').mockImplementation(() => {})

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    sessionToken: 'session=1234',
    realm: '/realms/root/realms/alpha'
  }

  const mockPhase0ConfigFile = path.resolve(
    __dirname,
    '../../config/phase-0/am-scripts/scripts-config.json'
  )
  const mockPhase1ConfigFile1 = path.resolve(
    __dirname,
    '../../config/phase-1/am-scripts/scripts-config.json'
  )

  const mockPhase0Config = {
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
        filename: "filename.js"
      }
    ]
  }

  const mockPhase1Config = {
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
          filename: "filename.js"
        }
      ]
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
    fs.readdirSync.mockReturnValue(['scripts-config.json'])
    fs.readFileSync.mockReturnValue('<base64encoding>')
    jest.mock(mockPhase0ConfigFile, () => mockPhase0Config, { virtual: true })
    jest.mock(mockPhase1ConfigFile1, () => mockPhase1Config, { virtual: true })
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
    await updateScripts(mockValues)
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
    await updateScripts(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should call API with phase 0 config by default', async () => {
    expect.assertions(2)
    const expectedUrl = `${mockValues.fidcUrl}/am/json${mockValues.realm}/scripts/${mockPhase0Config.scripts[0].payload._id}`
    const expectedApiOptions = {
      method: 'put',
      headers: {
        'content-type': 'application/json',
        'x-requested-with': 'ForgeRock CREST.js',
        'Accept-API-Version': 'resource=1.1',
        cookie: mockValues.sessionToken
      },
      body: JSON.stringify(mockPhase0Config.scripts[0].payload)
    }
    await updateScripts(mockValues)
    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedApiOptions)
  })

  it('should call API with phase config by environment variable', async () => {
    process.env.PHASE = 1
    const expectedUrl = `${mockValues.fidcUrl}/am/json${mockValues.realm}/scripts/${mockPhase1Config.scripts[0].payload._id}`
    const expectedApiOptions = {
      method: 'put',
      body: JSON.stringify(mockPhase1Config.scripts[0].payload),
      headers: {
        'content-type': 'application/json',
        'x-requested-with': 'ForgeRock CREST.js',
        'Accept-API-Version': 'resource=1.1',
        cookie: mockValues.sessionToken
      }
    }
    await updateScripts(mockValues)
    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedApiOptions)
  })

  it('should error if API request fails', async () => {
    const errorMessage = 'testing request failed'
    fetch.mockImplementation(() => Promise.reject(new Error(errorMessage)))
    await updateScripts(mockValues)
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
    await updateScripts(mockValues)
    expect(console.error).toHaveBeenCalledWith(`${mockPhase1Config.scripts[0].payload._id} 401: Unauthorized`)
    expect(process.exit).toHaveBeenCalledWith(1)
  })
})
