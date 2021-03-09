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

  const updateAuthTrees = require('../../scripts/update-auth-trees')

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    sessionToken: 'session=1234',
    realm: 'alpha'
  }

  const mockConfigFile = path.resolve(
    __dirname,
    '../../config/auth-trees/login-tree.json'
  )

  const mockConfig = {
    nodes: [
      {
        _id: 'abcd',
        nodeType: 'IncrementLoginCountNode'
      }
    ],
    tree: {
      _id: 'auth_tree',
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

  const expectedBaseUrl = `${mockValues.fidcUrl}/am/json/realms/root/realms/${mockValues.realm}/realm-config/authentication/authenticationtrees`

  beforeEach(() => {
    getSessionToken.mockImplementation(() =>
      Promise.resolve(mockValues.sessionToken)
    )
    fidcRequest.mockImplementation(() => Promise.resolve())
    process.env.FIDC_URL = mockValues.fidcUrl
    fs.readdirSync.mockReturnValue(['login-tree.json'])
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

  it('should call API using config file', async () => {
    expect.assertions(3)

    const node = mockConfig.nodes[0]
    const expectNodeUrl = `${expectedBaseUrl}/nodes/${node.nodeType}/${node._id}`
    const expectedNodeBody = {
      _id: node._id,
      ...node.details
    }

    const expectedAuthTreeUrl = `${expectedBaseUrl}/trees/${mockConfig.tree._id}`

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
      mockConfig.tree,
      mockValues.sessionToken,
      true
    ])
  })

  it('should update the url if the realm is changed', async () => {
    expect.assertions(3)
    const updatedRealm = 'bravo'
    mockValues.realm = updatedRealm
    const updatedBaseUrl = `${mockValues.fidcUrl}/am/json/realms/root/realms/${updatedRealm}/realm-config/authentication/authenticationtrees`

    const node = mockConfig.nodes[0]
    const expectNodeUrl = `${updatedBaseUrl}/nodes/${node.nodeType}/${node._id}`
    const expectedNodeBody = {
      _id: node._id,
      ...node.details
    }

    const expectedAuthTreeUrl = `${updatedBaseUrl}/trees/${mockConfig.tree._id}`

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
      mockConfig.tree,
      mockValues.sessionToken,
      true
    ])
  })
})
