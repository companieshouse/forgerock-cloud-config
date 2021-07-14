const path = require('path')
const getAccessToken = require('../helpers/get-access-token')
const fidcRequest = require('../helpers/fidc-request')

const updateUiConfig = async (argv) => {
  const { FIDC_URL } = process.env

  try {
    const accessToken = await getAccessToken(argv)

    // Combine managed object JSON files
    const dir = path.resolve(__dirname, '../config/ui')

    const fileContent = require(path.join(dir, 'ui-config.json'))

    const requestUrl = `${FIDC_URL}/openidm/config/ui/configuration`
    await fidcRequest(requestUrl, fileContent, accessToken)
    console.log('UI config updated')
    return Promise.resolve()
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = updateUiConfig
