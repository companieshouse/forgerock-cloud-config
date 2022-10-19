const fetch = require('node-fetch')

const fidcRequest = async (requestUrl, body, token, sessionToken) => {
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
    method: 'put',
    body: JSON.stringify(body),
    headers
  }

  const { status, statusText } = await fetch(requestUrl, requestOptions)
  if (status > 299) {
    console.log(`PUT Error ${status}: ${statusText} - ${requestUrl}`)
    throw new Error(`${status}: ${statusText}`)
  }
  return Promise.resolve()
}

module.exports = fidcRequest
