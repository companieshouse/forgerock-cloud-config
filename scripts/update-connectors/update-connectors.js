const fetch = require('node-fetch')
const path = require('path')
const getAccessToken = require('../../helpers/get-access-token')

const updateConnectors = async (argv) => {
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
      `../../config/phase-${PHASE}/connectors`
    )

    const connectorsFileContent = require(path.join(dir, 'connectors.json'))

    const requestUrl = `${FIDC_URL}/openidm/config/provisioner.openicf.connectorinfoprovider`

    const requestOptions = {
      method: 'put',
      body: JSON.stringify(connectorsFileContent),
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json'
      }
    }

    const { status, statusText } = await fetch(requestUrl, requestOptions)
    if (status !== 200) {
      throw new Error(`${status}: ${statusText}`)
    }
    console.log('Connectors updated')
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = updateConnectors
