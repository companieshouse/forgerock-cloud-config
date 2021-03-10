const fs = require('fs')
const path = require('path')
const getSessionToken = require('../helpers/get-session-token')
const fidcRequest = require('../helpers/fidc-request')
const replaceSensitiveValues = require('../helpers/replace-sensitive-values')

const updateApplications = async (argv) => {
  const { realm } = argv
  const { FIDC_URL, UI_URL } = process.env

  try {
    const sessionToken = await getSessionToken(argv)

    // Read application JSON files
    const dir = path.resolve(__dirname, '../config/applications')

    await replaceSensitiveValues(dir, [/{REPLACEMENT_UI_URL}/g], [UI_URL])

    const applicationFileContent = fs
      .readdirSync(dir)
      .filter((name) => path.extname(name) === '.json') // Filter out any non JSON files
      .map((filename) => require(path.join(dir, filename))) // Map JSON file content to an array

    // Update each application
    await Promise.all(
      applicationFileContent.map(async (applicationFile) => {
        const requestUrl = `${FIDC_URL}/am/json/realms/root/realms/${realm}/realm-config/agents/OAuth2Client/${applicationFile._id}`
        await fidcRequest(requestUrl, applicationFile, sessionToken, true)
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
