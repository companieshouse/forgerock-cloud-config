const updateAgents = require('./update-agents')
const updateApplications = require('./update-applications')
const updateAuthTrees = require('./update-auth-trees')
const updateConnectorDefinitions = require('./update-connector-definitions')
const updateConnectorMappings = require('./update-connector-mappings')
const updateConnectorSchedules = require('./update-connector-schedules')
const updateCors = require('./update-cors')
const updateInternalRoles = require('./update-internal-roles')
const updateManagedObjects = require('./update-managed-objects')
const updateRemoteServers = require('./update-remote-servers')
const updateScripts = require('./update-scripts')
const updateServices = require('./update-services')
const updateTermsAndConditions = require('./update-terms-and-conditions')
const updatePasswordPolicy = require('./update-password-policy')
const updateUiConfig = require('./update-ui-config')
const updateUserRoles = require('./update-user-roles')
const updateIdmEndpoints = require('./update-idm-endpoints')
const updateIdmAccessConfig = require('./update-idm-access-config')

module.exports = {
  updateAgents,
  updateApplications,
  updateAuthTrees,
  updateConnectorDefinitions,
  updateConnectorMappings,
  updateConnectorSchedules,
  updateCors,
  updateInternalRoles,
  updateManagedObjects,
  updateRemoteServers,
  updateScripts,
  updateServices,
  updateTermsAndConditions,
  updatePasswordPolicy,
  updateUiConfig,
  updateUserRoles,
  updateIdmEndpoints,
  updateIdmAccessConfig
}
