const fetch = require('node-fetch')

const getSessionToken = async (argv) => {
  const { username, password } = argv
  const { FIDC_URL } = process.env

  // Get session token
  const requestUrl = `${FIDC_URL}/am/json/realms/root/authenticate`

  const topLevelRequestOptions = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    }
  }

  const sessionTokenRequestBody = {
    authId: null,
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
            value: username
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
            value: password
          }
        ],
        _id: 1
      }
    ]
  }

  try {
    // Get authId from Top-Level realm
    const topLevelResponse = await fetch(requestUrl, topLevelRequestOptions)
    if (topLevelResponse.status > 299) {
      throw new Error(
        `${topLevelResponse.status}: ${topLevelResponse.statusText}`
      )
    }
    const { authId } = await topLevelResponse.json()

    // Use authId and credentials to get a session token
    sessionTokenRequestBody.authId = authId
    const sessionTokenRequestOptions = {
      ...topLevelRequestOptions,
      body: JSON.stringify(sessionTokenRequestBody)
    }

    const sessionTokenResponse = await fetch(
      requestUrl,
      sessionTokenRequestOptions
    )
    if (sessionTokenResponse.status > 299) {
      console.log('Error while getting Session Token')
      throw new Error(
        `${sessionTokenResponse.status}: ${sessionTokenResponse.statusText}`
      )
    }
    return Promise.resolve(sessionTokenResponse.headers.get('set-cookie'))
  } catch (error) {
    return Promise.reject(error)
  }
}

module.exports = getSessionToken
