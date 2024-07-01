describe('fidc-request', () => {
  jest.mock('node-fetch')
  const fetch = require('node-fetch')

  const fidcRequest = require('../../helpers/fidc-request')

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    fidcCookieName: '12345678',
    token: 'abcd-1234',
    body: {
      _id: 'abcd',
      nodeType: 'DecisionNode',
      details: {
        options: ['true', 'false']
      }
    }
  }

  const expectedAccessTokenHeaders = {
    Authorization: `Bearer ${mockValues.token}`,
    'Content-Type': 'application/json'
  }

  const expectedSessionTokenHeaders = {
    'content-type': 'application/json',
    'x-requested-with': 'ForgeRock CREST.js',
    [mockValues.fidcCookieName]: mockValues.token
  }

  beforeEach(() => {
    process.env.FIDC_COOKIE_NAME = mockValues.fidcCookieName
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should error if API call fails', async () => {
    expect.assertions(1)
    const error = new Error('Something went wrong')
    fetch.mockImplementation(() => Promise.reject(error))
    await expect(
      fidcRequest(mockValues.fidcUrl, mockValues.body, mockValues.token)
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
      fidcRequest(mockValues.fidcUrl, mockValues.body, mockValues.token)
    ).rejects.toEqual(new Error('401: Unauthorized'))
  })

  it('should call the API using access token by default', async () => {
    expect.assertions(3)
    const expectedOptions = {
      method: 'put',
      body: JSON.stringify(mockValues.body),
      headers: expectedAccessTokenHeaders
    }
    fetch.mockImplementation(() =>
      Promise.resolve({
        status: 200,
        statusText: 'OK'
      })
    )
    await expect(
      fidcRequest(mockValues.fidcUrl, mockValues.body, mockValues.token)
    ).resolves.toEqual()
    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch.mock.calls[0]).toEqual([mockValues.fidcUrl, expectedOptions])
  })

  it('should call the API using session token if flagged', async () => {
    expect.assertions(3)
    const expectedOptions = {
      method: 'put',
      body: JSON.stringify(mockValues.body),
      headers: expectedSessionTokenHeaders
    }
    fetch.mockImplementation(() =>
      Promise.resolve({
        status: 200,
        statusText: 'OK'
      })
    )
    await expect(
      fidcRequest(mockValues.fidcUrl, mockValues.body, mockValues.token, true)
    ).resolves.toEqual()
    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch.mock.calls[0]).toEqual([mockValues.fidcUrl, expectedOptions])
  })
})
