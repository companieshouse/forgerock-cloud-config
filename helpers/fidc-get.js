const fetch = require('node-fetch')

const fidcGet = async (requestUrl, token, sessionToken) => {
  const { FIDC_COOKIE_NAME } = process.env
  const headers = sessionToken
    ? {
        'content-type': 'application/json',
        'x-requested-with': 'ForgeRock CREST.js',
        [FIDC_COOKIE_NAME]: token,
        'Accept-API-Version': 'resource=1.0'
      }
    : {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

  const esvMode = (requestUrl.indexOf('/environment/variables/') > -1 ||
    requestUrl.indexOf('/environment/secrets/') > -1 ||
    requestUrl.indexOf('/environment/startup') > -1 ||
    requestUrl.indexOf('/openidm/script?_action=eval') > -1)

  if (esvMode) {
    headers['Accept-API-Version'] = 'protocol=1.0,resource=1.0'
  }

  const requestOptions = {
    method: 'get',
    body: null,
    headers
  }

  const response = await fetch(requestUrl, requestOptions)

  if (response.status !== 200) {
    if (!esvMode || (esvMode && ((response.status !== 404) && (response.status !== 422)))) {
      console.log(`GET Error ${response.status}: ${response.statusText} - ${requestUrl}`)
    }
    throw new Error(`${response.status}: ${response.statusText}`)
  }

  return await response.json()
}

module.exports = fidcGet
