const fetch = require('node-fetch')
const fs = require('fs')
const path = require('path')
const getAccessToken = require('../../helpers/get-access-token')

const updateInternalRoles = async (argv) => {
  // Check environment variables
  const { FIDC_URL, PHASE = '0' } = process.env

  if (!FIDC_URL) {
    console.error('Missing FIDC_URL environment variable')
    return process.exit(1)
  }

  try {
    const accessToken = await getAccessToken(argv)

    console.log(`Using phase ${PHASE} config`)

    // Combine internal roles JSON files
    const dir = path.resolve(
      __dirname,
      `../../config/phase-${PHASE}/internal-roles`
    )

    const internalRolesFileContent = fs
      .readdirSync(dir)
      .filter((name) => path.extname(name) === '.json') // Filter out any non JSON files
      .map((filename) => require(path.join(dir, filename))) // Map JSON file content to an array

    await Promise.all(
      internalRolesFileContent.map(async (internalRoleFile) => {
        const requestUrl = `${FIDC_URL}/openidm/internal/role/${internalRoleFile._id}`
        const requestOptions = {
          method: 'put',
          body: JSON.stringify(internalRoleFile),
          headers: {
            authorization: `Bearer ${accessToken}`,
            'content-type': 'application/json'
          }
        }
        const { status, statusText } = await fetch(requestUrl, requestOptions)
        if (status > 299) {
          return Promise.reject(
            new Error(`${internalRoleFile.name} ${status}: ${statusText}`)
          )
        }
        console.log(`${internalRoleFile.name} updated`)
        return Promise.resolve()
      })
    )
    console.log('Internal roles updated')
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = updateInternalRoles
