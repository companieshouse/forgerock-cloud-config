const fetch = require('node-fetch')

const getAccessToken = async (argv) => {
  const {
    idmUsername,
    idmPassword,
    adminClientId,
    adminClientSecret,
    realm
  } = argv
  const { FIDC_URL } = process.env

  // Get access token
  const requestUrl = `${FIDC_URL}/am/oauth2/realms/root/realms/${realm}/access_token?auth_chain=PasswordGrant`
  const body = new URLSearchParams()
  body.append('username', idmUsername)
  body.append('password', idmPassword)
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
