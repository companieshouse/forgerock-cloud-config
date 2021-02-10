const fetch = require('node-fetch')
const fs = require('fs')
const path = require('path')
const getSessionToken = require('../../helpers/get-session-token')
const getAccessToken = require('../../helpers/get-access-token')

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
    const dir = path.resolve(
      __dirname,
      `../../config/phase-${PHASE}/cors`
    )

    const corsFileContent = fs
      .readdirSync(dir)
      .filter((name) => path.extname(name) === '.json') // Filter out any non JSON files
      .map((filename) => require(path.join(dir, filename))) // Map JSON file content to an array

    // Update AM CORS settings
    await Promise.all(

      corsFileContent.map(async (corsConfigFile) => {
        const baseUrl = `${FIDC_URL}/am/json/global-config/services/CorsService`
        await updateCorsService(baseUrl, sessionToken, corsConfigFile.corsServiceGlobal)
        await updateCorsServiceConfig(baseUrl, sessionToken, corsConfigFile.corsServiceConfig)
        await updateCorsIDMConfig(`${FIDC_URL}`, accessToken, corsConfigFile.idmCorsConfig)
        console.log('CORS configuration updated in AM and IDM')
        return Promise.resolve()
      })
    )
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

const updateCorsService = async (requestUrl, cookieHeader, config) => {
  const requestOptions = {
    method: 'put',
    body: JSON.stringify(config),
    headers: {
      'content-type': 'application/json',
      'x-requested-with': 'XMLHttpRequest',
      'Accept-API-Version': 'protocol=1.0,resource=1.0',
      cookie: cookieHeader
    }
  }
  const { status, statusText } = await fetch(requestUrl, requestOptions)
  if (status > 299) {
    throw new Error(`${status}: ${statusText}`)
  }
  return Promise.resolve()
}

const updateCorsServiceConfig = async (url, cookieHeader, config) => {
  const requestUrl = `${url}/configuration/${config._id}`
  const requestOptions = {
    method: 'put',
    body: JSON.stringify(config),
    headers: {
      'content-type': 'application/json',
      'x-requested-with': 'XMLHttpRequest',
      'Accept-API-Version': 'protocol=1.0,resource=1.0',
      cookie: cookieHeader
    }
  }
  const { status, statusText } = await fetch(requestUrl, requestOptions)
  if (status > 299) {
    throw new Error(`${config._id} ${status}: ${statusText}`)
  }
  return Promise.resolve()
}

const updateCorsIDMConfig = async (url, accessToken, config) => {
  // Update all managed objects
  const requestUrl = `${url}/openidm/config/servletfilter/cors`

  const requestOptions = {
    method: 'put',
    body: JSON.stringify(config),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept-API-Version': 'resource=1.0'
    }
  }
  const { status, statusText } = await fetch(requestUrl, requestOptions)
  if (status !== 200) {
    throw new Error(`${status}: ${statusText}`)
  }
}

module.exports = updateCors
