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

  const requestOptions = {
    method: 'put',
    body: JSON.stringify(body),
    headers
  }

  const { status, statusText } = await fetch(requestUrl, requestOptions)
  if (status > 299) {
    console.log(`Error ${status}: ${statusText}`)
    throw new Error(`${status}: ${statusText}`)
  }
  return Promise.resolve()
}

module.exports = fidcRequest
