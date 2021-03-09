const updateApplications = require('./update-applications')
const updateConnectorDefinitions = require('./update-connector-definitions')
const updateConnectorMappings = require('./update-connector-mappings')
const updateRemoteServers = require('./update-remote-servers')
const updateScripts = require('./update-scripts')

module.exports = {
  updateApplications,
  updateConnectorDefinitions,
  updateConnectorMappings,
  updateRemoteServers,
  updateScripts
}
