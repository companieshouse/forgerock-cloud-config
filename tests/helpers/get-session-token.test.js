describe('get-session-token', () => {
  jest.mock('node-fetch')
  const fetch = require('node-fetch')
  jest.spyOn(console, 'log').mockImplementation(() => {})

  const getSessionToken = require('../../helpers/get-session-token')

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    username: 'test-user',
    password: 'SecurePassword123',
    topLevelAuthId: 'auth-1234',
    userAuthId: 'auth-5678',
    sessionToken: 'session=1234'
  }

  const expectedUrl = `${mockValues.fidcUrl}/am/json/realms/root/authenticate`

  const expectedTopLevelOptions = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    }
  }

  const expectedUserRequestBody = {
    authId: mockValues.topLevelAuthId,
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

  const expectedMfaPromptRequestBody = {
    authId: mockValues.userAuthId,
    callbacks: [
      {
        type: 'TextOutputCallback',
        output: [
          {
            name: 'message',
            value: 'message'
          },
          {
            name: 'messageType',
            value: '0'
          }
        ]
      },
      {
        type: 'ConfirmationCallback',
        output: [
          {
            name: 'prompt',
            value: ''
          },
          {
            name: 'messageType',
            value: 0
          },
          {
            name: 'options',
            value: ['Set up']
          },
          {
            name: 'optionType',
            value: -1
          },
          {
            name: 'defaultOption',
            value: 0
          }
        ],
        input: [
          {
            name: 'IDToken2',
            value: 0
          }
        ]
      },
      {
        type: 'HiddenValueCallback',
        output: [
          {
            name: 'value',
            value: 'false'
          },
          {
            name: 'id',
            value: 'skip-input'
          }
        ],
        input: [
          {
            name: 'IDToken3',
            value: 'Skip'
          }
        ]
      },
      {
        type: 'TextOutputCallback',
        output: [
          {
            name: 'message',
            value:
              'var skipContainer = document.createElement("div");skipContainer.style = "width: 100%";skipContainer.innerHTML = "<button id=\'skip-link\' class=\'btn btn-block btn-link\' type=\'submit\'>Skip for now</button>";document.getElementById("skip-input").parentNode.append(skipContainer);document.getElementsByClassName("callback-component").forEach(  function (e) {    var message = e.firstElementChild;    if (message.firstChild && message.firstChild.nodeName == "#text" && message.firstChild.nodeValue.trim() == "message") {      message.align = "center";      message.innerHTML = "<h2 class=\'h2\'>Set up 2-step verification</h2><div style=\'margin-bottom:1em\'>Protect your account by adding a second step after entering your password to verify it\'s you signing in.</div>";    }  })'
          },
          {
            name: 'messageType',
            value: '4'
          }
        ]
      },
      {
        type: 'TextOutputCallback',
        output: [
          {
            name: 'message',
            value:
              'document.getElementById("skip-link").onclick = function() {  document.getElementById("skip-input").value = "Skip";  document.getElementById("loginButton_0").click();  return false;}'
          },
          {
            name: 'messageType',
            value: '4'
          }
        ]
      }
    ]
  }

  const expectedUserRequestOptions = {
    ...expectedTopLevelOptions,
    body: JSON.stringify(expectedUserRequestBody)
  }

  const expectedMfaPromptRequestOptions = {
    ...expectedTopLevelOptions,
    body: JSON.stringify(expectedMfaPromptRequestBody)
  }

  beforeEach(() => {
    process.env.FIDC_URL = mockValues.fidcUrl
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should call APIs with the correct options', async () => {
    expect.assertions(4)
    fetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve({ authId: mockValues.topLevelAuthId })
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve({ authId: mockValues.userAuthId })
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
      expectedUserRequestOptions
    ])
    expect(fetch.mock.calls[2]).toEqual([
      expectedUrl,
      expectedMfaPromptRequestOptions
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

  it('should reject if the user API request fails', async () => {
    expect.assertions(2)
    const errorMessage = 'user request failed'
    fetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve({ authId: mockValues.topLevelAuthId })
        })
      )
      .mockImplementationOnce(() => Promise.reject(new Error(errorMessage)))

    await expect(getSessionToken(mockValues)).rejects.toEqual(
      new Error(errorMessage)
    )
    expect(fetch.mock.calls.length).toEqual(2)
  })

  it('should reject if the mfa prompt API request fails', async () => {
    expect.assertions(2)
    const errorMessage = 'mfa prompt request failed'
    fetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve({ authId: mockValues.topLevelAuthId })
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve({ authId: mockValues.userAuthId })
        })
      )
      .mockImplementationOnce(() => Promise.reject(new Error(errorMessage)))

    await expect(getSessionToken(mockValues)).rejects.toEqual(
      new Error(errorMessage)
    )
    expect(fetch.mock.calls.length).toEqual(3)
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

  it('should reject if user API response is not 2xx', async () => {
    expect.assertions(2)
    fetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve({ authId: mockValues.topLevelAuthId })
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

  it('should reject if mfa prompt API response is not 2xx', async () => {
    expect.assertions(2)
    fetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve({ authId: mockValues.topLevelAuthId })
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve({ authId: mockValues.userAuthId })
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
    expect(fetch.mock.calls.length).toEqual(3)
  })
})
