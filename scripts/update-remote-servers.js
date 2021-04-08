const path = require('path')
const getAccessToken = require('../helpers/get-access-token')
const fidcRequest = require('../helpers/fidc-request')

const updateRemoteServers = async (argv) => {
  const { FIDC_URL } = process.env

  try {
    const accessToken = await getAccessToken(argv)

    const dir = path.resolve(__dirname, '../config/connectors')

    const remoteServersFileContent = require(path.join(
      dir,
      'remote-servers.json'
    ))

    const requestUrl = `${FIDC_URL}/openidm/config/provisioner.openicf.connectorinfoprovider`

    await fidcRequest(requestUrl, remoteServersFileContent, accessToken)
    console.log('Remote servers updated')
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = updateRemoteServers
