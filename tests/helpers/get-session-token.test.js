describe('get-session-token', () => {
  jest.mock('node-fetch')
  const fetch = require('node-fetch')

  const getSessionToken = require('../../helpers/get-session-token')

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    username: 'test-user',
    password: 'SecurePassword123',
    realm: '/realms/root/realms/alpha',
    authId: 'auth-1234',
    sessionToken: 'session=1234'
  }

  const expectedUrl = `${mockValues.fidcUrl}/am/json${mockValues.realm}/authenticate`

  const expectedTopLevelOptions = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    }
  }

  const expectedSessionTokenBody = {
    authId: mockValues.authId,
    callbacks: [
      {
        type: 'NameCallback',
        output: [
          {
            name: 'prompt',
            value: 'User Name'
          }
        ],
        input: [
          {
            name: 'IDToken1',
            value: mockValues.username
          }
        ],
        _id: 0
      },
      {
        type: 'PasswordCallback',
        output: [
          {
            name: 'prompt',
            value: 'Password'
          }
        ],
        input: [
          {
            name: 'IDToken2',
            value: mockValues.password
          }
        ],
        _id: 1
      }
    ]
  }

  const expectedSessionTokenOptions = {
    ...expectedTopLevelOptions,
    body: JSON.stringify(expectedSessionTokenBody)
  }

  beforeEach(() => {
    process.env.FIDC_URL = mockValues.fidcUrl
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should reject if missing FRIC environment variable', async () => {
    expect.assertions(1)
    delete process.env.FIDC_URL
    await expect(getSessionToken(mockValues)).rejects.toEqual(
      new Error('Missing FIDC_URL environment variable')
    )
  })

  it('should call APIs with the correct options', async () => {
    expect.assertions(3)
    fetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve({ authId: mockValues.authId })
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          statusText: 'OK',
          headers: {
            get: () => Promise.resolve(mockValues.sessionToken)
          }
        })
      )
    await expect(getSessionToken(mockValues)).resolves.toEqual(
      mockValues.sessionToken
    )
    expect(fetch.mock.calls[0]).toEqual([expectedUrl, expectedTopLevelOptions])
    expect(fetch.mock.calls[1]).toEqual([
      expectedUrl,
      expectedSessionTokenOptions
    ])
  })

  it('should reject if the top-level API request fails', async () => {
    expect.assertions(2)
    const errorMessage = 'top level request failed'
    fetch.mockImplementationOnce(() => Promise.reject(new Error(errorMessage)))

    await expect(getSessionToken(mockValues)).rejects.toEqual(
      new Error(errorMessage)
    )
    expect(fetch.mock.calls.length).toEqual(1)
  })

  it('should reject if the session token API request fails', async () => {
    expect.assertions(2)
    const errorMessage = 'session token request failed'
    fetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve({ authId: mockValues.authId })
        })
      )
      .mockImplementationOnce(() => Promise.reject(new Error(errorMessage)))

    await expect(getSessionToken(mockValues)).rejects.toEqual(
      new Error(errorMessage)
    )
    expect(fetch.mock.calls.length).toEqual(2)
  })

  it('should reject if top-level API response is not 2xx', async () => {
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

  it('should reject if session token API response is not 2xx', async () => {
    expect.assertions(2)
    fetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve({ authId: mockValues.authId })
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          status: 401,
          statusText: 'Unauthorized'
        })
      )

    await expect(getSessionToken(mockValues)).rejects.toEqual(
      new Error('401: Unauthorized')
    )
    expect(fetch.mock.calls.length).toEqual(2)
  })
})
