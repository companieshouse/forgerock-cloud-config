const fetch = require('node-fetch')

const fidcPost = async (requestUrl, body, token, sessionToken) => {
  const headers = sessionToken
    ? {
        'content-type': 'application/json',
        'x-requested-with': 'ForgeRock CREST.js',
        cookie: token
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
    method: 'post',
    body: JSON.stringify(body),
    headers
  }

  const response = await fetch(requestUrl, requestOptions)

  if (response.status > 299) {
    console.log(`POST Error ${response.status}: ${response.statusText} - ${requestUrl}`)
    throw new Error(`${response.status}: ${response.statusText}`)
  }

  return await response.json()
}

module.exports = fidcPost
