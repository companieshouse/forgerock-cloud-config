const fs = require('fs')
const path = require('path')
const getSessionToken = require('../helpers/get-session-token')
const fidcRequest = require('../helpers/fidc-request')

const updateAuthTrees = async (argv) => {
  const { realm } = argv
  const { FIDC_URL } = process.env

  try {
    const sessionToken = await getSessionToken(argv)

    // Read auth tree JSON files
    const dir = path.resolve(__dirname, '../config/auth-trees')

    const authTreesFileContent = fs
      .readdirSync(dir)
      .filter((name) => path.extname(name) === '.json') // Filter out any non JSON files
      .map((filename) => require(path.join(dir, filename))) // Map JSON file content to an array

    // Update each auth tree
    await authTreesFileContent.reduce(async (previousPromise, authTreeFile) => {
      await previousPromise
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
      console.log(`Nodes updated - ${authTreeFile.tree._id}`)
      const requestUrl = `${baseUrl}/trees/${authTreeFile.tree._id}`
      await fidcRequest(requestUrl, authTreeFile.tree, sessionToken, true)
      console.log(`Tree updated - ${authTreeFile.tree._id}`)
      return Promise.resolve()
    }, Promise.resolve())
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = updateAuthTrees
