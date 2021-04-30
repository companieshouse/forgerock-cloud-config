const fs = require('fs')
const path = require('path')
const getAccessToken = require('../helpers/get-access-token')
const fidcRequest = require('../helpers/fidc-request')

const updateAccessConfig = async (argv) => {
  const { FIDC_URL } = process.env

  try {
    const accessToken = await getAccessToken(argv)

    // Read auth tree JSON files
    const dir = path.resolve(__dirname, '../config/idm-access-config')

    const scriptFileContent = fs
      .readdirSync(dir)
      .filter((name) => path.extname(name) === '.json') // Filter out any non JSON files
      .map((filename) => require(path.join(dir, filename))) // Map JSON file content to an array

    const requestUrl = `${FIDC_URL}/openidm/config/access`

    await fidcRequest(requestUrl, scriptFileContent[0], accessToken)

    console.log('IDM access configuration updated')
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = updateAccessConfig
