const fetch = require('node-fetch')

const getServiceAccountToken = async () => {
  const getSignedJWT = require('./get-signed-jwt')

  const { FIDC_URL, SERVICE_ACCOUNT_ID, SERVICE_ACCOUNT_KEY } = process.env

  const requestUrl = `${FIDC_URL}:443/am/oauth2/access_token`
  const signedJWT = await getSignedJWT(SERVICE_ACCOUNT_ID, SERVICE_ACCOUNT_KEY, requestUrl)

  // Get access token
  const body = new URLSearchParams()
  body.append('client_id', 'service-account')
  body.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer')
  body.append('assertion', signedJWT)
  body.append('scope', 'fr:am:* fr:idm:* fr:idc:esv:*')
  const requestOptions = {
    method: 'post',
    body
  }

  try {
    const response = await fetch(requestUrl, requestOptions)
    if (response.status !== 200) {
      console.log('Error while getting Service Account Token')
      throw new Error(`${response.status}: ${response.statusText}`)
    }
    const responseJson = await response.json()

    return Promise.resolve(responseJson.access_token)
  } catch (error) {
    return Promise.reject(error)
  }
}
module.exports = getServiceAccountToken
