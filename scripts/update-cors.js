const fs = require('fs')
const path = require('path')
const getAccessToken = require('../helpers/get-access-token')
const fidcRequest = require('../helpers/fidc-request')

const updateCors = async (argv) => {
  const { FIDC_URL } = process.env

  try {
    const accessToken = await getAccessToken(argv)

    // Read auth tree JSON files
    const dir = path.resolve(__dirname, '../config/cors')

    const corsFileContent = fs
      .readdirSync(dir)
      .filter((name) => path.extname(name) === '.json') // Filter out any non JSON files
      .map((filename) => require(path.join(dir, filename))) // Map JSON file content to an array

    // Update AM CORS settings
    await Promise.all(
      corsFileContent.map(async (corsConfigFile) => {
        const idmUrl = `${FIDC_URL}/openidm/config/servletfilter/cors`
        await fidcRequest(
          idmUrl,
          corsConfigFile.idmCorsConfig,
          accessToken,
          false)
        console.log('CORS configuration updated in IDM')
        return Promise.resolve()
      })
    )
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = updateCors
