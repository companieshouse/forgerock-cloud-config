const fs = require('fs')
const path = require('path')
const getServiceAccountToken = require('../helpers/get-service-account-token')
const fidcRequest = require('../helpers/fidc-request')
const replaceSensitiveValues = require('../helpers/replace-sensitive-values')

const updateAgents = async (argv) => {
  const { realm, igAgentPassword } = argv
  const { FIDC_URL } = process.env

  try {
    const accessToken = await getServiceAccountToken()

    // Read agent JSON files
    const dir = path.resolve(__dirname, '../config/agents')

    await replaceSensitiveValues(
      dir,
      [/{IG_AGENT_PASSWORD}/g],
      [/{RCS_AGENT_PASSWORD}/g],
      [igAgentPassword],
      [igAgentPassword] // using same password for both IG agent and RCS agent
    )

    const agentFileContent = fs
      .readdirSync(dir)
      .filter((name) => path.extname(name) === '.json') // Filter out any non JSON files
      .map((filename) => require(path.join(dir, filename))) // Map JSON file content to an array

    // Update each application
    await Promise.all(
      agentFileContent.map(async (agentFile) => {
        const requestUrl = `${FIDC_URL}/am/json/realms/root/realms/${realm}/realm-config/agents/${agentFile._type._id}/${agentFile._id}`
        delete agentFile._type
        await fidcRequest(requestUrl, agentFile, accessToken, false)
        console.log(`${agentFile._id} updated`)
        return Promise.resolve()
      })
    )
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = updateAgents
