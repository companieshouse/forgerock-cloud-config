const path = require('path')
const fs = require('fs')
const getAccessToken = require('../helpers/get-access-token')
const fidcRequest = require('../helpers/fidc-request')

const updateConnectorSchedules = async (argv) => {
  const { FIDC_URL } = process.env

  try {
    const accessToken = await getAccessToken(argv)

    const dir = path.resolve(__dirname, '../config/connectors/schedules')

    const scheduleFilesContent = fs
      .readdirSync(`${dir}`)
      .filter((name) => path.extname(name) === '.json') // Filter out any non JSON files
      .map((filename) => require(path.join(`${dir}`, filename))) // Map JSON file content to an array

    // Update each schedule
    await Promise.all(
      scheduleFilesContent.map(async (scheduleFile) => {
        const requestUrl = `${FIDC_URL}/openidm/scheduler/job/${scheduleFile._id}`
        await fidcRequest(requestUrl, scheduleFile, accessToken)
        console.log(`${scheduleFile._id} updated`)
        return Promise.resolve()
      })
    )

    console.log('Connector mappings updated')
    return Promise.resolve()
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = updateConnectorSchedules
