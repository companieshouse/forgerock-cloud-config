const fetch = require('node-fetch')

const fidcGet = async (requestUrl, token, sessionToken) => {
  const headers = sessionToken
    ? {
        'content-type': 'application/json',
        'x-requested-with': 'ForgeRock CREST.js',
        cookie: token,
        'Accept-API-Version': 'resource=1.0'
      }
    : {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

  const esvMode = (requestUrl.indexOf('/environment/variables/') > -1 ||
    requestUrl.indexOf('/environment/secrets/') > -1 ||
    requestUrl.indexOf('/environment/startup') > -1)

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
    if (!esvMode || (esvMode && response.status !== 404)) {
      console.log(`Error ${response.status}: ${response.statusText} - ${requestUrl}`)
    }
    throw new Error(`${response.status}: ${response.statusText}`)
  }

  return await response.json()
}

module.exports = fidcGet
