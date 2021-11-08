const getAccessToken = require('../helpers/get-access-token')
const fidcGet = require('../helpers/fidc-get')

const getManagedUser = async (argv) => {
  const { realm, managedUsername } = argv
  const { FIDC_URL } = process.env

  try {
    const accessToken = await getAccessToken(argv)

    const baseUrl = `${FIDC_URL}/openidm/managed/${realm}_user`

    const requestUrl = `${baseUrl}?_queryFilter=userName%20sw%20%22${managedUsername}%22&_pageSize=50&_sortKeys=userName&_totalPagedResultsPolicy=EXACT&_fields=`
    const response = await fidcGet(requestUrl, accessToken, false)

    console.log(JSON.stringify(response, null, 2))
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = getManagedUser
