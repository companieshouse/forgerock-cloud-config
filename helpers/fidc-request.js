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
    requestUrl.indexOf('/environment/startup') > -1)

  if (esvMode) {
    headers['Accept-API-Version'] = 'protocol=1.0,resource=1.0'
  }

  const requestOptions = {
    method: 'put',
    body: JSON.stringify(body),
    headers
  }

  const { status, statusText, text } = await fetch(requestUrl, requestOptions)

  if (status > 299) {
    console.log(`Error ${status}: ${statusText} - ${requestUrl}`)
    if (text) {
      console.log(text())
    }
    throw new Error(`${status}: ${statusText}`)
  }
  return Promise.resolve()
}

module.exports = fidcRequest
