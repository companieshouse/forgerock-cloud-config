const fs = require('fs')
const path = require('path')
const getAccessToken = require('../../helpers/get-access-token')
const fidcRequest = require('../../helpers/fidc-request')

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
        await fidcRequest(requestUrl, internalRoleFile, accessToken)
      })
    )
    console.log('Internal roles updated')
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = updateInternalRoles
