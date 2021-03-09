const updateApplications = require('./update-applications')
const updateAuthTrees = require('./update-auth-trees')
const updateConnectorDefinitions = require('./update-connector-definitions')
const updateConnectorMappings = require('./update-connector-mappings')
const updateCors = require('./update-cors')
const updateRemoteServers = require('./update-remote-servers')
const updateScripts = require('./update-scripts')

module.exports = {
  updateApplications,
  updateAuthTrees,
  updateConnectorDefinitions,
  updateConnectorMappings,
  updateCors,
  updateRemoteServers,
  updateScripts
}
