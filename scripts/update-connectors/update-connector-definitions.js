const fetch = require('node-fetch')
const path = require('path')
const fs = require('fs')
const getAccessToken = require('../../helpers/get-access-token')

const updateConnectorDefinitions = async (argv) => {
  // Check environment variables
  const { FIDC_URL, PHASE = '0' } = process.env

  if (!FIDC_URL) {
    console.error('Missing FIDC_URL environment variable')
    return process.exit(1)
  }

  try {
    const accessToken = await getAccessToken(argv)

    console.log(`Using phase ${PHASE} config`)

    const dir = path.resolve(
      __dirname,
      `../../config/phase-${PHASE}/connectors/definitions`
    )

    const connectorFileContent = fs
      .readdirSync(`${dir}`)
      .filter((name) => path.extname(name) === '.json') // Filter out any non JSON files
      .map((filename) => require(path.join(`${dir}`, filename))) // Map JSON file content to an array

    // Update each connector
    await Promise.all(
      connectorFileContent.map(async (connectorFile) => {
        const requestUrl = `${FIDC_URL}/openidm/config/${connectorFile._id}`
        const requestOptions = {
          method: 'put',
          body: JSON.stringify(connectorFile),
          headers: {
            authorization: `Bearer ${accessToken}`,
            'content-type': 'application/json'
          }
        }
        const { status, statusText } = await fetch(requestUrl, requestOptions)
        if (status > 299) {
          return Promise.reject(new Error(`${status}: ${statusText}`))
        }
        console.log(`${connectorFile._id} updated`)
        return Promise.resolve()
      })
    )
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = updateConnectorDefinitions
