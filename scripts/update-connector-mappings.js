const path = require('path')
const fs = require('fs')
const getAccessToken = require('../helpers/get-access-token')
const fidcRequest = require('../helpers/fidc-request')

const updateConnectorMappings = async (argv) => {
  const { FIDC_URL } = process.env

  try {
    const accessToken = await getAccessToken(argv)

    const dir = path.resolve(__dirname, '../config/connectors/mappings')

    const mappingFilesContent = fs
      .readdirSync(`${dir}`)
      .filter((name) => path.extname(name) === '.json') // Filter out any non JSON files
      .map((filename) => require(path.join(`${dir}`, filename))) // Map JSON file content to an array

    const requestUrl = `${FIDC_URL}/openidm/config/sync`
    const requestBody = {
      mappings: mappingFilesContent
    }

    // Update the Event scripts if we have been supplied them in the config
    for (const mappingObject of mappingFilesContent) {
      for (const eventName of ['onCreate', 'onUpdate', 'onError']) {
        const eventScriptName = mappingObject.name + '_' + eventName + '.js'

        const fileEventScript = path.resolve(__dirname, '../config/connectors/mappings/event-scripts/' + eventScriptName)
        if (fs.existsSync(fileEventScript)) {
          if (!mappingObject[eventName]) {
            mappingObject[eventName] = {}
          }
          mappingObject[eventName].source = fs.readFileSync(fileEventScript, { encoding: 'utf8' })
        }
      }
    }

    await fidcRequest(requestUrl, requestBody, accessToken)

    console.log('Connector mappings updated')
    return Promise.resolve()
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = updateConnectorMappings
