describe('get-session-token', () => {
  jest.mock('node-fetch')
  const fetch = require('node-fetch')
  jest.spyOn(console, 'log').mockImplementation(() => {})

  const getSessionToken = require('../../helpers/get-session-token')

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    username: 'test-user',
    password: 'SecurePassword123',
    sessionToken: 'session=1234'
  }

  const expectedUrl = `${mockValues.fidcUrl}/am/json/realms/root/realms/alpha/authenticate`

  const expectedOptions = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'X-OpenAM-Username': mockValues.username,
      'X-OpenAM-Password': mockValues.password,
      'Accept-API-Version': 'resource=2.0, protocol=1.0'
    }
  }

  beforeEach(() => {
    process.env.FIDC_URL = mockValues.fidcUrl
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should call APIs with the correct options', async () => {
    expect.assertions(2)
    fetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve({ tokenId: mockValues.sessionToken })
        })
      )

    await expect(getSessionToken(mockValues)).resolves.toEqual(
      mockValues.sessionToken
    )
    expect(fetch.mock.calls[0]).toEqual([expectedUrl, expectedOptions])
  })

  it('should reject if the request fails', async () => {
    expect.assertions(2)
    const errorMessage = 'request failed'
    fetch.mockImplementationOnce(() => Promise.reject(new Error(errorMessage)))

    await expect(getSessionToken(mockValues)).rejects.toEqual(
      new Error(errorMessage)
    )
    expect(fetch.mock.calls.length).toEqual(1)
  })

  it('should reject if API response is not 2xx', async () => {
    expect.assertions(2)
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        status: 401,
        statusText: 'Unauthorized'
      })
    )

    await expect(getSessionToken(mockValues)).rejects.toEqual(
      new Error('401: Unauthorized')
    )
    expect(fetch.mock.calls.length).toEqual(1)
  })
})
