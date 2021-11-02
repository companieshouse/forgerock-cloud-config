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

  const requestOptions = {
    method: 'get',
    body: null,
    headers
  }

  const response = await fetch(requestUrl, requestOptions)

  if (response.status !== 200) {
    console.log(`Error ${response.status}: ${response.statusText} - ${requestUrl}`)
    throw new Error(`${response.status}: ${response.statusText}`)
  }

  return await response.json()
}

module.exports = fidcGet
