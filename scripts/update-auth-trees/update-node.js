const fetch = require('node-fetch')

const updateNode = async (url, cookieHeader, node) => {
  const requestUrl = `${url}/nodes/${node.nodeType}/${node._id}`
  const requestOptions = {
    method: 'put',
    body: JSON.stringify({
      _id: node._id,
      ...node.details
    }),
    headers: {
      'content-type': 'application/json',
      'x-requested-with': 'ForgeRock CREST.js',
      cookie: cookieHeader
    }
  }
  const { status, statusText } = await fetch(requestUrl, requestOptions)
  if (status > 299) {
    throw new Error(`${node._id} ${status}: ${statusText}`)
  }
  return Promise.resolve()
}

module.exports = updateNode
