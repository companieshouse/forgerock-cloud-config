const path = require('path')
const getAccessToken = require('../helpers/get-access-token')
const fidcRequest = require('../helpers/fidc-request')

const updatePasswordPolicy = async (argv) => {
  const { FIDC_URL } = process.env

  try {
    const accessToken = await getAccessToken(argv)

    // Combine managed object JSON files
    const dir = path.resolve(__dirname, '../config/password-policy')

    const fileContent = require(path.join(dir, 'password-policy.json'))

    const requestUrl = `${FIDC_URL}/openidm/config/fieldPolicy/alpha_user`
    await fidcRequest(requestUrl, fileContent, accessToken)
    console.log('Alpha user password policy updated')
    return Promise.resolve()
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = updatePasswordPolicy
