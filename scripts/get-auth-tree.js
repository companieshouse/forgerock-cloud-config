const getSessionToken = require('../helpers/get-session-token')
const fidcGet = require('../helpers/fidc-get')

const getAuthTree = async (argv) => {
  const { realm, authTreeName } = argv
  const { FIDC_URL } = process.env

  try {
    const sessionToken = await getSessionToken(argv)

    const baseUrl = `${FIDC_URL}/am/json/realms/root/realms/${realm}/realm-config/authentication/authenticationtrees`

    const requestUrl = `${baseUrl}/trees/${authTreeName}?forUI=true`
    const response = await fidcGet(requestUrl, sessionToken, true)

    // Tidy up the tree response so that it can be persisted correctly
    delete response._rev

    Object.keys(response.nodes).forEach(node => {
      delete response.nodes[node]._outcomes
    })

    const ret = { nodes: [], tree: response }

    if (response && response.nodes) {
      for (const [key, value] of Object.entries(response.nodes)) {
        const nodeResponse = await processNode(FIDC_URL, realm, sessionToken, key, value)
        ret.nodes.push(nodeResponse)
      }
    }

    console.log(JSON.stringify(ret, null, 2))
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

async function processNode (FIDC_URL, realm, sessionToken, nodeId, node) {
  const nodeType = node.nodeType
  const requestUrlNode = `${FIDC_URL}/am/json/realms/root/realms/${realm}/realm-config/authentication/authenticationtrees/nodes/${nodeType}/${nodeId}`

  const nodeDetails = await fidcGet(requestUrlNode, sessionToken, true)

  const nodeRet = { _id: nodeId, nodeType: nodeType, details: {} }

  Object.keys(nodeDetails).forEach(key => {
    if (!key.startsWith('_')) {
      nodeRet.details[key] = nodeDetails[key]
    }
  })

  return nodeRet
}

module.exports = getAuthTree
