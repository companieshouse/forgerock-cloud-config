const path = require('path')
const getAccessToken = require('../helpers/get-access-token')
const fidcRequest = require('../helpers/fidc-request')

const updateTermsAndConditions = async (argv) => {
  const { FIDC_URL, PHASE = '0' } = process.env

  try {
    const accessToken = await getAccessToken(argv)

    console.log(`Using phase ${PHASE} config`)

    // Combine managed object JSON files
    const dir = path.resolve(__dirname, `../config/phase-${PHASE}/consent`)

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
