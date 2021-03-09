const fs = require('fs')
const path = require('path')
const getSessionToken = require('../helpers/get-session-token')
const fidcRequest = require('../helpers/fidc-request')
const replaceSensitiveValues = require('../helpers/replace-sensitive-values')

const updateServices = async (argv) => {
  const { realm } = argv
  const { FIDC_URL } = process.env

  try {
    const sessionToken = await getSessionToken(argv)

    // Read JSON files
    const dir = path.resolve(__dirname, '../config/services')

    await replaceSensitiveValues(
      dir,
      ['{REPLACEMENT_HASH_SALT}'],
      [argv.hashSalt]
    )

    const servicesFileContent = fs
      .readdirSync(dir)
      .filter((name) => path.extname(name) === '.json') // Filter out any non JSON files
      .map((filename) => require(path.join(dir, filename))) // Map JSON file content to an array

    // Update each service
    await Promise.all(
      servicesFileContent.map(async (serviceFile) => {
        const requestUrl = `${FIDC_URL}/am/json/realms/root/realms/${realm}/realm-config/services/${serviceFile._id}`
        await fidcRequest(requestUrl, serviceFile, sessionToken, true)
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
