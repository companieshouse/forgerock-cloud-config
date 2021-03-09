const fs = require('fs')
const path = require('path')
const getSessionToken = require('../helpers/get-session-token')
const getAccessToken = require('../helpers/get-access-token')
const fidcRequest = require('../helpers/fidc-request')

const updateCors = async (argv) => {
  const { FIDC_URL } = process.env

  try {
    const sessionToken = await getSessionToken(argv)

    const accessTokenParams = {
      ...argv,
      username: argv.idmUsername,
      password: argv.idmPassword
    }

    const accessToken = await getAccessToken(accessTokenParams)

    // Read auth tree JSON files
    const dir = path.resolve(__dirname, '../config/cors')

    const corsFileContent = fs
      .readdirSync(dir)
      .filter((name) => path.extname(name) === '.json') // Filter out any non JSON files
      .map((filename) => require(path.join(dir, filename))) // Map JSON file content to an array

    // Update AM CORS settings
    await Promise.all(
      corsFileContent.map(async (corsConfigFile) => {
        const serviceUrl = `${FIDC_URL}/am/json/global-config/services/CorsService`
        const serviceConfigUrl = `${serviceUrl}/configuration/${corsConfigFile.corsServiceConfig._id}`
        const idmUrl = `${FIDC_URL}/openidm/config/servletfilter/cors`
        await fidcRequest(
          serviceUrl,
          corsConfigFile.corsServiceGlobal,
          sessionToken,
          true
        )
        await fidcRequest(
          serviceConfigUrl,
          corsConfigFile.corsServiceConfig,
          sessionToken,
          true
        )
        await fidcRequest(idmUrl, corsConfigFile.idmCorsConfig, accessToken)
        console.log('CORS configuration updated in AM and IDM')
        return Promise.resolve()
      })
    )
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = updateCors
