const fetch = require('node-fetch')
const fs = require('fs')
const path = require('path')
const getSessionToken = require('../../helpers/get-session-token')
const replaceSensitiveValues = require('../../helpers/replace-sensitive-values')

const updateServices = async (argv) => {
  const { realm } = argv

  // Check environment variables
  const { FIDC_URL, PHASE = '0' } = process.env

  if (!FIDC_URL) {
    console.error('Missing FIDC_URL environment variable')
    return process.exit(1)
  }

  try {
    const sessionToken = await getSessionToken(argv)

    console.log(`Using phase ${PHASE} config`)

    // Read JSON files
    const dir = path.resolve(__dirname, `../../config/phase-${PHASE}/services`)

    await replaceSensitiveValues(
      dir,
      ['{REPLACEMENT_HASH_SALT}'],
      [argv.hash_salt]
    )

    const servicesFileContent = fs
      .readdirSync(dir)
      .filter((name) => path.extname(name) === '.json') // Filter out any non JSON files
      .map((filename) => require(path.join(dir, filename))) // Map JSON file content to an array

    // Update each service
    await Promise.all(
      servicesFileContent.map(async (serviceFile) => {
        const requestUrl = `${FIDC_URL}/am/json${realm}/realm-config/services/${serviceFile._id}`
        const requestOptions = {
          method: 'put',
          body: JSON.stringify(serviceFile),
          headers: {
            'content-type': 'application/json',
            'x-requested-with': 'ForgeRock CREST.js',
            cookie: sessionToken
          }
        }
        const { status, statusText } = await fetch(requestUrl, requestOptions)
        if (status > 299) {
          return Promise.reject(new Error(`${status}: ${statusText}`))
        }
        console.log(`${serviceFile._id} updated`)
        return Promise.resolve()
      })
    )
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = updateServices
