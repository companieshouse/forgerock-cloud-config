const fs = require('fs')
const path = require('path')
const getSessionToken = require('../helpers/get-session-token')
const fidcRequest = require('../helpers/fidc-request')
const fileFilter = require('../helpers/file-filter')

const updateAuthTrees = async (argv) => {
  const { realm } = argv
  const { FIDC_URL, filenameFilter } = process.env

  try {
    const sessionToken = await getSessionToken(argv)

    // Setup the Auth Tree config for token timeout
    const treeAuth = path.resolve(__dirname, '../config/auth-trees/settings/tree-auth.json')
    if (fs.existsSync(treeAuth)) {
      const treeAuthJson = fs.readFileSync(treeAuth, { encoding: 'utf8' })
      if (treeAuthJson) {
        const requestUrl = `${FIDC_URL}/am/json/realms/root/realms/${realm}/realm-config/authentication`
        await fidcRequest(requestUrl, JSON.parse(treeAuthJson), sessionToken, true)
        console.log('Tree Auth settings updated')
      }
    }

    // Read auth tree JSON files
    const dir = path.resolve(__dirname, '../config/auth-trees')
    const useFF = filenameFilter || argv.filenameFilter

    const authTreesFileContent = fs
      .readdirSync(dir)
      .filter((name) => path.extname(name) === '.json') // Filter out any non JSON files
      .filter((name) => fileFilter(name, useFF)) // Filter based on name, if required
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
