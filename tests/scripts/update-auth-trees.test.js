describe('update-auth-trees', () => {
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

  const updateAuthTrees = require('../../scripts/update-auth-trees/update-auth-trees')

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    sessionToken: 'session=1234',
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

  const expectedBaseUrl = `${mockValues.fidcUrl}/am/json${mockValues.realm}/realm-config/authentication/authenticationtrees`

  beforeEach(() => {
    getSessionToken.mockImplementation(() =>
      Promise.resolve(mockValues.sessionToken)
    )
    fidcRequest.mockImplementation(() => Promise.resolve())
    process.env.FIDC_URL = mockValues.fidcUrl
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
    await updateAuthTrees(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should error if fidcRequest function fails', async () => {
    expect.assertions(2)
    const errorMessage = 'Forbidden'
    fidcRequest.mockImplementation(() =>
      Promise.reject(new Error(errorMessage))
    )
    await updateAuthTrees(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should call API with phase 0 config by default', async () => {
    expect.assertions(3)

    const node = mockPhase0Config.nodes[0]
    const expectNodeUrl = `${expectedBaseUrl}/nodes/${node.nodeType}/${node._id}`
    const expectedNodeBody = {
      _id: node._id,
      ...node.details
    }

    const expectedAuthTreeUrl = `${expectedBaseUrl}/trees/${mockPhase0Config.tree._id}`

    await updateAuthTrees(mockValues)
    expect(fidcRequest.mock.calls.length).toEqual(2)
    expect(fidcRequest.mock.calls[0]).toEqual([
      expectNodeUrl,
      expectedNodeBody,
      mockValues.sessionToken,
      true
    ])
    expect(fidcRequest.mock.calls[1]).toEqual([
      expectedAuthTreeUrl,
      mockPhase0Config.tree,
      mockValues.sessionToken,
      true
    ])
  })

  it('should call API with phase config by environment variable', async () => {
    expect.assertions(3)
    process.env.PHASE = 1
    fs.readdirSync.mockReturnValue([
      'login-tree.json',
      'registration-tree.json'
    ])

    const node = mockPhase1Config.nodes[0]
    const expectNodeUrl = `${expectedBaseUrl}/nodes/${node.nodeType}/${node._id}`
    const expectedNodeBody = {
      _id: node._id,
      ...node.details
    }

    const expectedAuthTreeUrl = `${expectedBaseUrl}/trees/${mockPhase1Config.tree._id}`

    await updateAuthTrees(mockValues)
    expect(fidcRequest.mock.calls.length).toEqual(4)
    expect(fidcRequest.mock.calls[0]).toEqual([
      expectNodeUrl,
      expectedNodeBody,
      mockValues.sessionToken,
      true
    ])
    expect(fidcRequest.mock.calls[2]).toEqual([
      expectedAuthTreeUrl,
      mockPhase1Config.tree,
      mockValues.sessionToken,
      true
    ])
  })

  it('should update the url if the realm is changed', async () => {
    expect.assertions(3)
    const updatedRealm = '/realms/root/realms/bravo'
    mockValues.realm = updatedRealm
    const updatedBaseUrl = `${mockValues.fidcUrl}/am/json${updatedRealm}/realm-config/authentication/authenticationtrees`

    const node = mockPhase0Config.nodes[0]
    const expectNodeUrl = `${updatedBaseUrl}/nodes/${node.nodeType}/${node._id}`
    const expectedNodeBody = {
      _id: node._id,
      ...node.details
    }

    const expectedAuthTreeUrl = `${updatedBaseUrl}/trees/${mockPhase0Config.tree._id}`

    await updateAuthTrees(mockValues)
    expect(fidcRequest.mock.calls.length).toEqual(2)
    expect(fidcRequest.mock.calls[0]).toEqual([
      expectNodeUrl,
      expectedNodeBody,
      mockValues.sessionToken,
      true
    ])
    expect(fidcRequest.mock.calls[1]).toEqual([
      expectedAuthTreeUrl,
      mockPhase0Config.tree,
      mockValues.sessionToken,
      true
    ])
  })
})
