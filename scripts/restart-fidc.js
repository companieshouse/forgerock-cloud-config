const getServiceAccountToken = require('../helpers/get-service-account-token')
const fidcPost = require('../helpers/fidc-post')

const restartFidc = async () => {
  const { FIDC_URL } = process.env

  try {
    const accessToken = await getServiceAccountToken()

    const requestUrl = `${FIDC_URL}/environment/startup?_action=restart`

    await fidcPost(requestUrl, {}, accessToken, false)

    console.log('Server restart initiated.')
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = restartFidc
