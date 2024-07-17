const fs = require('fs')
const path = require('path')
const getServiceAccountToken = require('../helpers/get-service-account-token')
const fidcRequest = require('../helpers/fidc-request')
const replaceSensitiveValues = require('../helpers/replace-sensitive-values')

const updateApplications = async (argv) => {
  const { realm, authTreePassword, igOidcPassword } = argv
  const { FIDC_URL, UI_URL, EWF_URL } = process.env

  try {
    if (!UI_URL || !EWF_URL) {
      throw new Error('Missing required environment variable(s)')
    }

    const accessToken = await getServiceAccountToken()

    // Read application JSON files
    const dir = path.resolve(__dirname, '../config/applications')

    await replaceSensitiveValues(
      dir,
      [
        /{UI_URL}/g,
        /{EWF_URL}/g,
        /{AUTH_TREE_PASSWORD}/g,
        /{IG_OIDC_PASSWORD}/g
      ],
      [UI_URL, EWF_URL, authTreePassword, igOidcPassword]
    )

    const applicationFileContent = fs
      .readdirSync(dir)
      .filter((name) => path.extname(name) === '.json') // Filter out any non JSON files
      .map((filename) => require(path.join(dir, filename))) // Map JSON file content to an array

    // Update each application
    await Promise.all(
      applicationFileContent.map(async (applicationFile) => {
        const requestUrl = `${FIDC_URL}/am/json/realms/root/realms/${realm}/realm-config/agents/OAuth2Client/${applicationFile._id}`
        await fidcRequest(requestUrl, applicationFile, accessToken, false)
        console.log(`${applicationFile._id} updated`)
        return Promise.resolve()
      })
    )
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = updateApplications
