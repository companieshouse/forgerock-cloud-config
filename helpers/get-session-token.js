const fetch = require('node-fetch')

const getSessionToken = async (argv) => {
  const { username, password } = argv
  const { FIDC_URL } = process.env

  // Get session token
  const requestUrl = `${FIDC_URL}/am/json/realms/root/realms/alpha/authenticate`

  const requestOptions = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'X-OpenAM-Username': username,
      'X-OpenAM-Password': password,
      'Accept-API-Version': 'resource=2.0, protocol=1.0'
    }
  }

  try {
    const response = await fetch(requestUrl, requestOptions)
    if (response.status > 299) {
      console.log('Error while getting Session Token')
      throw new Error(
        `${response.status}: ${response.statusText}`
      )
    }
    const responseJson = await response.json()
    const sessionToken = responseJson.tokenId

    return Promise.resolve(sessionToken)
  } catch (error) {
    return Promise.reject(error)
  }
}

module.exports = getSessionToken
