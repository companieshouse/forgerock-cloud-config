describe('update-auth-trees', () => {
  jest.mock('node-fetch')
  const fetch = require('node-fetch')
  jest.mock('fs')
  const fs = require('fs')
  const path = require('path')
  jest.mock('../../helpers/get-session-token')
  const getSessionToken = require('../../helpers/get-session-token')
  jest.mock('../../scripts/update-auth-trees/update-node')
  const updateNode = require('../../scripts/update-auth-trees/update-node')
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(process, 'exit').mockImplementation(() => {})

  const updateAuthTrees = require('../../scripts/update-auth-trees/update-auth-trees')

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    fidcCookieName: 'frcookie',
    sessionToken: 'forgerock-token',
    realm: '/realms/root/realms/alpha'
  }

  const mockPhase0ConfigFile = path.resolve(
    __dirname,
    '../../config/phase-0/auth-trees/login-tree.json'
  )
  const mockPhase1ConfigFile1 = path.resolve(
    __dirname,
    '../../config/phase-1/auth-trees/login-tree.json'
  )
  const mockPhase1ConfigFile2 = path.resolve(
    __dirname,
    '../../config/phase-1/auth-trees/registration-tree.json'
  )

  const mockPhase0Config = {
    nodes: [
      {
        _id: 'abcd',
        nodeType: 'IncrementLoginCountNode'
      }
    ],
    tree: {
      _id: 'Phase0',
      entryNodeId: '1234',
      staticNodes: {
        startNode: {
          x: 50,
          y: 25
        }
      },
      uiConfig: {},
      nodes: {
        abcd: {
          displayName: 'Increment Login Count',
          nodeType: 'IncrementLoginCountNode',
          x: 220,
          y: 34,
          connections: {
            outcome: '5678'
          }
        }
      }
    }
  }

  const mockPhase1Config = {
    nodes: [
      {
        _id: 'abcd',
        nodeType: 'IncrementLoginCountNode'
      }
    ],
    tree: {
      _id: 'Phase1',
      entryNodeId: '1234',
      staticNodes: {
        startNode: {
          x: 100,
          y: 50
        }
      },
      uiConfig: {},
      nodes: {
        abcd: {
          displayName: 'Increment Login Count',
          nodeType: 'IncrementLoginCountNode',
          x: 120,
          y: 14,
          connections: {
            outcome: '5678'
          }
        }
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
    updateNode.mockImplementation(() => Promise.resolve())
    process.env.FIDC_URL = mockValues.fidcUrl
    process.env.FIDC_COOKIE_NAME = mockValues.fidcCookieName
    delete process.env.PHASE
    fs.readdirSync.mockReturnValue(['login-tree.json'])
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
    await updateAuthTrees(mockValues)
    expect(console.error).toHaveBeenCalledWith(
      'Missing required environment variable(s)'
    )
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should error if missing FIDC_COOKIE_NAME environment variable', async () => {
    expect.assertions(2)
    delete process.env.FIDC_COOKIE_NAME
    await updateAuthTrees(mockValues)
    expect(console.error).toHaveBeenCalledWith(
      'Missing required environment variable(s)'
    )
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should error if getSessionToken functions fails', async () => {
    expect.assertions(2)
    const errorMessage = 'Invalid user'
    getSessionToken.mockImplementation(() =>
      Promise.reject(new Error(errorMessage))
    )
    await updateAuthTrees(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should error if updateNode function fails', async () => {
    expect.assertions(2)
    const errorMessage = 'Forbidden'
    updateNode.mockImplementation(() => Promise.reject(new Error(errorMessage)))
    await updateAuthTrees(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should call API with phase 0 config by default', async () => {
    expect.assertions(2)
    const expectedUrl = `${mockValues.fidcUrl}/am/json${mockValues.realm}/realm-config/authentication/authenticationtrees/trees/${mockPhase0Config.tree._id}`
    const expectedApiOptions = {
      method: 'put',
      headers: {
        'content-type': 'application/json',
        'x-requested-with': 'ForgeRock CREST.js',
        cookie: `${mockValues.fidcCookieName}=${mockValues.sessionToken}`
      },
      body: JSON.stringify(mockPhase0Config.tree)
    }
    await updateAuthTrees(mockValues)
    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedApiOptions)
  })

  it('should call API with phase config by environment variable', async () => {
    process.env.PHASE = 1
    fs.readdirSync.mockReturnValue([
      'login-tree.json',
      'registration-tree.json'
    ])
    const expectedUrl = `${mockValues.fidcUrl}/am/json${mockValues.realm}/realm-config/authentication/authenticationtrees/trees/${mockPhase1Config.tree._id}`
    const expectedApiOptions = {
      method: 'put',
      headers: {
        'content-type': 'application/json',
        'x-requested-with': 'ForgeRock CREST.js',
        cookie: `${mockValues.fidcCookieName}=${mockValues.sessionToken}`
      },
      body: JSON.stringify(mockPhase1Config.tree)
    }
    await updateAuthTrees(mockValues)
    expect(fetch.mock.calls.length).toEqual(2)
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedApiOptions)
  })

  it('should call update the url if the realm is changed', async () => {
    expect.assertions(2)
    const updatedRealm = '/realms/root/realms/alpha'
    mockValues.realm = updatedRealm
    const expectedUrl = `${mockValues.fidcUrl}/am/json${updatedRealm}/realm-config/authentication/authenticationtrees/trees/${mockPhase0Config.tree._id}`
    const expectedApiOptions = {
      method: 'put',
      headers: {
        'content-type': 'application/json',
        'x-requested-with': 'ForgeRock CREST.js',
        cookie: `${mockValues.fidcCookieName}=${mockValues.sessionToken}`
      },
      body: JSON.stringify(mockPhase0Config.tree)
    }
    await updateAuthTrees(mockValues)
    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedApiOptions)
  })

  it('should error if API request fails', async () => {
    const errorMessage = 'testing request failed'
    fetch.mockImplementation(() => Promise.reject(new Error(errorMessage)))
    await updateAuthTrees(mockValues)
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
    await updateAuthTrees(mockValues)
    expect(console.error).toHaveBeenCalledWith('401: Unauthorized')
    expect(process.exit).toHaveBeenCalledWith(1)
  })
})
