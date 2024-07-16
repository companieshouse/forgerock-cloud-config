const fs = require('fs')
const path = require('path')
const getServiceAccountToken = require('../helpers/get-service-account-token')
const fidcRequest = require('../helpers/fidc-request')

const updateCors = async () => {
  const { FIDC_URL } = process.env

  try {
    const accessToken = await getServiceAccountToken()

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
          accessToken,
          false
        )
        await fidcRequest(
          serviceConfigUrl,
          corsConfigFile.corsServiceConfig,
          accessToken,
          false
        )
        console.log('CORS configuration updated in AM')
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
