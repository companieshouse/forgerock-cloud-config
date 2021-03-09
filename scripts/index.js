const updateApplications = require('./update-applications')
const updateAuthTrees = require('./update-auth-trees')
const updateConnectorDefinitions = require('./update-connector-definitions')
const updateConnectorMappings = require('./update-connector-mappings')
const updateCors = require('./update-cors')
const updateInternalRoles = require('./update-internal-roles')
const updateManagedObjects = require('./update-managed-objects')
const updateRemoteServers = require('./update-remote-servers')
const updateScripts = require('./update-scripts')
const updateServices = require('./update-services')
const updateTermsAndConditions = require('./update-terms-and-conditions')
const updateUserRoles = require('./update-user-roles')

module.exports = {
  updateApplications,
  updateAuthTrees,
  updateConnectorDefinitions,
  updateConnectorMappings,
  updateCors,
  updateInternalRoles,
  updateManagedObjects,
  updateRemoteServers,
  updateScripts,
  updateServices,
  updateTermsAndConditions,
  updateUserRoles
}
