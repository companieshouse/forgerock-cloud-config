const fs = require('fs')
const path = require('path')
const getSessionToken = require('../../helpers/get-session-token')
const getAccessToken = require('../../helpers/get-access-token')
const fidcRequest = require('../../helpers/fidc-request')

const updateCors = async (argv) => {
  // Check environment variables
  const { FIDC_URL, PHASE = '0' } = process.env

  argv.realm = '/realms/root'
  if (!FIDC_URL) {
    console.error('Missing FIDC_URL environment variable')
    return process.exit(1)
  }

  try {
    const sessionToken = await getSessionToken(argv)

    const accessTokenParams = {
      username: argv.idmusername,
      password: argv.idmpassword,
      adminClientId: argv.adminClientId,
      adminClientSecret: argv.adminClientSecret,
      realm: '/alpha'
    }
    const accessToken = await getAccessToken(accessTokenParams)
    console.log(`Using phase ${PHASE} config`)

    // Read auth tree JSON files
    const dir = path.resolve(__dirname, `../../config/phase-${PHASE}/cors`)

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
