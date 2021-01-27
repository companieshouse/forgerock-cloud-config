describe('update-auth-trees', () => {
  jest.mock('node-fetch')
  const fetch = require('node-fetch')

  const updateNode = require('../../scripts/update-auth-trees/update-node')

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    fidcCookieHeader: 'frcookie=1234',
    node: {
      _id: 'abcd',
      nodeType: 'DecisionNode',
      details: {
        options: ['true', 'false']
      }
    }
  }

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should error if API call fails', async () => {
    expect.assertions(1)
    const error = new Error('Something went wrong')
    fetch.mockImplementation(() => Promise.reject(error))
    await expect(
      updateNode(
        mockValues.fidcUrl,
        mockValues.fidcCookieHeader,
        mockValues.node
      )
    ).rejects.toEqual(error)
  })

  it('should error if API call status is not 2xx', async () => {
    expect.assertions(1)
    fetch.mockImplementation(() =>
      Promise.resolve({
        status: 401,
        statusText: 'Unauthorized'
      })
    )
    await expect(
      updateNode(
        mockValues.fidcUrl,
        mockValues.fidcCookieHeader,
        mockValues.node
      )
    ).rejects.toEqual(new Error(`${mockValues.node._id} 401: Unauthorized`))
  })

  it('should call the API with the correct options', async () => {
    expect.assertions(3)
    const expectedUrl = `${mockValues.fidcUrl}/nodes/${mockValues.node.nodeType}/${mockValues.node._id}`
    const expectedOptions = {
      method: 'put',
      body: JSON.stringify({
        _id: mockValues.node._id,
        ...mockValues.node.details
      }),
      headers: {
        'content-type': 'application/json',
        'x-requested-with': 'ForgeRock CREST.js',
        cookie: mockValues.fidcCookieHeader
      }
    }
    fetch.mockImplementation(() =>
      Promise.resolve({
        status: 200,
        statusText: 'OK'
      })
    )
    await expect(
      updateNode(
        mockValues.fidcUrl,
        mockValues.fidcCookieHeader,
        mockValues.node
      )
    ).resolves.toEqual()
    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch.mock.calls[0]).toEqual([expectedUrl, expectedOptions])
  })
})
