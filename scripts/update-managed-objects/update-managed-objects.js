const fetch = require('node-fetch')
const fs = require('fs')
const path = require('path')
const getAccessToken = require('../helpers/get-access-token')

const updateManagedObjects = async (argv) => {
  // Check environment variables
  const { FIDC_URL, PHASE = '0' } = process.env

  if (!FIDC_URL) {
    console.error('Missing FIDC_URL environment variable')
    return process.exit(1)
  }

  try {
    const accessToken = await getAccessToken(argv)

    console.log(`Using phase ${PHASE} config`)

    // Combine managed object JSON files
    const dir = path.resolve(
      __dirname,
      `../../config/phase-${PHASE}/managed-objects`
    )

    const managedObjects = fs
      .readdirSync(dir)
      .filter((name) => path.extname(name) === '.json') // Filter out any non JSON files
      .map((filename) => require(path.join(dir, filename))) // Map JSON file content to an array

    // Update all managed objects
    const requestUrl = `${FIDC_URL}/openidm/config/managed`

    const requestOptions = {
      method: 'put',
      body: JSON.stringify({
        objects: managedObjects
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }

    const { status, statusText } = await fetch(requestUrl, requestOptions)
    if (status !== 200) {
      throw new Error(`${status}: ${statusText}`)
    }
    console.log('Managed objects updated')
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = updateManagedObjects
