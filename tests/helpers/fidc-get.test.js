describe('fidc-get', () => {
  jest.mock('node-fetch')
  const fetch = require('node-fetch')

  const fidcGet = require('../../helpers/fidc-get')

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    fidcCookieName: '12345678',
    token: 'abcd-1234',
    body: null
  }

  const expectedAccessTokenHeaders = {
    Authorization: `Bearer ${mockValues.token}`,
    'Content-Type': 'application/json'
  }

  const expectedSessionTokenHeaders = {
    'content-type': 'application/json',
    'x-requested-with': 'ForgeRock CREST.js',
    [mockValues.fidcCookieName]: mockValues.token,
    'Accept-API-Version': 'resource=1.0'
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
      fidcGet(mockValues.fidcUrl, mockValues.token, true)
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
      fidcGet(mockValues.fidcUrl, mockValues.token, true)
    ).rejects.toEqual(new Error('401: Unauthorized'))
  })

  it('should call the API using access token by default', async () => {
    expect.assertions(3)
    const expectedOptions = {
      method: 'get',
      body: null,
      headers: expectedAccessTokenHeaders
    }
    fetch.mockImplementation(() => Promise.resolve({
      status: 200,
      statusText: 'OK',
      json: () => {}
    }))
    expect(
      await fidcGet(mockValues.fidcUrl, mockValues.token)
    ).toEqual()
    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch.mock.calls[0]).toEqual([mockValues.fidcUrl, expectedOptions])
  })

  it('should call the API using session token if flagged', async () => {
    expect.assertions(3)
    const expectedOptions = {
      method: 'get',
      body: null,
      headers: expectedSessionTokenHeaders
    }
    fetch.mockImplementation(() => Promise.resolve({
      status: 200,
      statusText: 'OK',
      json: () => {}
    }))
    expect(
      await fidcGet(mockValues.fidcUrl, mockValues.token, true)
    ).toEqual()
    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch.mock.calls[0]).toEqual([mockValues.fidcUrl, expectedOptions])
  })
})
