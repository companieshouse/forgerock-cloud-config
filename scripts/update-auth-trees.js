const fs = require('fs')
const path = require('path')
const getSessionToken = require('../helpers/get-session-token')
const fidcRequest = require('../helpers/fidc-request')

const updateAuthTrees = async (argv) => {
  const { realm } = argv
  const { FIDC_URL, PHASE = '0' } = process.env

  try {
    const sessionToken = await getSessionToken(argv)

    console.log(`Using phase ${PHASE} config`)

    // Read auth tree JSON files
    const dir = path.resolve(__dirname, `../config/phase-${PHASE}/auth-trees`)

    const authTreesFileContent = fs
      .readdirSync(dir)
      .filter((name) => path.extname(name) === '.json') // Filter out any non JSON files
      .map((filename) => require(path.join(dir, filename))) // Map JSON file content to an array

    // Update each auth tree
    await Promise.all(
      authTreesFileContent.map(async (authTreeFile) => {
        if (!authTreeFile.tree._id) {
          return Promise.reject(new Error('Missing _id in auth tree config'))
        }
        const baseUrl = `${FIDC_URL}/am/json/realms/root/realms/${realm}/realm-config/authentication/authenticationtrees`
        await Promise.all(
          authTreeFile.nodes.map(async (node) => {
            const nodeRequestUrl = `${baseUrl}/nodes/${node.nodeType}/${node._id}`
            const nodeRequestBody = {
              _id: node._id,
              ...node.details
            }
            return await fidcRequest(
              nodeRequestUrl,
              nodeRequestBody,
              sessionToken,
              true
            )
          })
        )
        console.log('nodes updated')
        const requestUrl = `${baseUrl}/trees/${authTreeFile.tree._id}`
        await fidcRequest(requestUrl, authTreeFile.tree, sessionToken, true)
        console.log(`${authTreeFile.tree._id} updated`)
        return Promise.resolve()
      })
    )
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = updateAuthTrees
