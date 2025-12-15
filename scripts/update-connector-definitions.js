const path = require('path')
const fs = require('fs')
const getAccessToken = require('../helpers/get-access-token')
const fidcRequest = require('../helpers/fidc-request')

const updateConnectorDefinitions = async (argv) => {
  const { FIDC_URL } = process.env

  try {
    const accessToken = await getAccessToken(argv)

    const dir = path.resolve(__dirname, '../config/connectors/definitions')

    const connectorFileContent = fs
      .readdirSync(`${dir}`)
      .filter((name) => path.extname(name) === '.json') // Filter out any non JSON files
      .map((filename) => require(path.join(`${dir}`, filename))) // Map JSON file content to an array

    for (const connectorFile of connectorFileContent) {
      const requestUrl = `${FIDC_URL}/openidm/config/${connectorFile._id}`
      await fidcRequest(requestUrl, connectorFile, accessToken)
      console.log(`${connectorFile._id} updated`)
    }
  } catch (error) {
    console.error(error.message)
    //process.exit(1)
  }
}

module.exports = updateConnectorDefinitions
