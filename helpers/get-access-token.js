const fetch = require('node-fetch')

const getAccessToken = async (argv) => {
  const { username, password, adminClientId, adminClientSecret, realm } = argv
  const { FIDC_URL } = process.env

  // Get access token
  const requestUrl = `${FIDC_URL}/am/oauth2/realms/root/realms/${realm}/access_token?auth_chain=PasswordGrant`
  const body = new URLSearchParams()
  body.append('username', username)
  body.append('password', password)
  body.append('client_id', adminClientId)
  body.append('client_secret', adminClientSecret)
  body.append('grant_type', 'password')
  body.append('scope', 'fr:idm:*')

  const requestOptions = {
    method: 'post',
    body
  }

  try {
    const response = await fetch(requestUrl, requestOptions)
    if (response.status !== 200) {
      console.log('Error while getting Access Token')
      throw new Error(`${response.status}: ${response.statusText}`)
    }
    const responseJson = await response.json()
    return Promise.resolve(responseJson.access_token)
  } catch (error) {
    return Promise.reject(error)
  }
}

module.exports = getAccessToken
