const path = require('path')
const getAccessToken = require('../helpers/get-access-token')
const fidcRequest = require('../helpers/fidc-request')
const replaceSensitiveValues = require('../helpers/replace-sensitive-values')

const updateTermsAndConditions = async (argv) => {
  const { FIDC_URL } = process.env

  try {
    const accessToken = await getAccessToken(argv)

    // Combine managed object JSON files
    const dir = path.resolve(__dirname, '../config/consent')

    await replaceSensitiveValues(
      dir,
      [/{REPLACEMENT_VERSION_NUMBER}/g],
      [argv.versionNumber]
    )

    const fileContent = require(path.join(dir, 'terms-and-conditions.json'))

    const requestUrl = `${FIDC_URL}/openidm/config/selfservice.terms`
    await fidcRequest(requestUrl, fileContent, accessToken)
    console.log('Terms and conditions updated')
    return Promise.resolve()
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = updateTermsAndConditions
