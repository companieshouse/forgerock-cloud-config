#!/usr/bin/env node
const yargs = require('yargs')
const cliOptions = require('./helpers/cli-options')
const {
  updateAgents,
  updateApplications,
  updateAuthTrees,
  getAuthTree,
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
  updateIdmAccessConfig,
  getManagedUser,
  updateManagedUsers,
  updateVariables,
  updateSecrets,
  restartFidc,
  getEsvConcourse,
  updateEsvAndRestart
} = require('./scripts')

require('dotenv').config()

if (!process.env.FIDC_URL) {
  console.error('Missing required environment variable: FIDC_URL')
  process.exit(1)
}

if (!process.env.FIDC_COOKIE_NAME) {
  console.error('Missing required environment variable: FIDC_COOKIE_NAME')
  process.exit(1)
}

if (!process.env.SERVICE_ACCOUNT_ID) {
  console.error('Missing required environment variable: SERVICE_ACCOUNT_ID')
  process.exit(1)
}

if (!process.env.SERVICE_ACCOUNT_KEY && (!process.env.SERVICE_ACCOUNT_KEY_PART_1 || !process.env.SERVICE_ACCOUNT_KEY_PART_2)) {
  console.error('Missing required environment variable: SERVICE_ACCOUNT_KEY or SERVICE_ACCOUNT_KEY_PART_1 and SERVICE_ACCOUNT_KEY_PART_2')
  process.exit(1)
}

process.env.SERVICE_ACCOUNT_KEY = process.env.SERVICE_ACCOUNT_KEY || JSON.stringify({ ...JSON.parse(process.env.SERVICE_ACCOUNT_KEY_PART_1), ...JSON.parse(process.env.SERVICE_ACCOUNT_KEY_PART_2) })

// Script arguments
yargs
  .usage('Usage: $0 [arguments]')
  .version(false)
  .help('h')
  .alias('h', 'help')
  .command({
    command: 'agents',
    desc: 'Update ForgeRock Agents (./config/agents)',
    builder: cliOptions(['realm', 'igAgentPassword']),
    handler: (argv) => updateAgents(argv)
  })
  .command({
    command: 'applications',
    desc: 'Update ForgeRock Applications (./config/applications)',
    builder: cliOptions([
      'realm',
      'authTreePassword',
      'igOidcPassword'
    ]),
    handler: (argv) => updateApplications(argv)
  })
  .command({
    command: 'auth-trees',
    desc: 'Update AM Auth Trees (./config/auth-trees)',
    builder: cliOptions(['username', 'password', 'realm', 'filenameFilter']),
    handler: (argv) => updateAuthTrees(argv)
  })
  .command({
    command: 'get-auth-tree',
    desc: 'Get AM Auth Tree (Journey)',
    builder: cliOptions(['username', 'password', 'realm', 'authTreeName']),
    handler: (argv) => getAuthTree(argv)
  })
  .command({
    command: 'connector-definitions',
    desc: 'Update IDM Connector Definitions (./config/connectors/definitions)',
    builder: cliOptions([
      'idmUsername',
      'idmPassword',
      'adminClientId',
      'adminClientSecret',
      'realm'
    ]),
    handler: (argv) => updateConnectorDefinitions(argv)
  })
  .command({
    command: 'connector-mappings',
    desc: 'Update IDM Connector Mappings (./config/connectors/mappings)',
    builder: cliOptions([
      'idmUsername',
      'idmPassword',
      'adminClientId',
      'adminClientSecret',
      'realm'
    ]),
    handler: (argv) => updateConnectorMappings(argv)
  })
  .command({
    command: 'connector-schedules',
    desc: 'Update IDM Connector Mappings (./config/connectors/schedules)',
    builder: cliOptions([
      'idmUsername',
      'idmPassword',
      'adminClientId',
      'adminClientSecret',
      'realm'
    ]),
    handler: (argv) => updateConnectorSchedules(argv)
  })
  .command({
    command: 'cors',
    desc: 'Update ForgeRock CORS (./config/cors)',
    builder: cliOptions([
      'realm'
    ]),
    handler: (argv) => updateCors(argv)
  })
  .command({
    command: 'internal-roles',
    desc: 'Update IDM Internal Roles (./config/internal-roles)',
    builder: cliOptions([
      'realm'
    ]),
    handler: (argv) => updateInternalRoles(argv)
  })
  .command({
    command: 'managed-objects',
    desc: 'Update IDM Managed Objects (./config/managed-objects)',
    builder: cliOptions([
      'idmUsername',
      'idmPassword',
      'adminClientId',
      'adminClientSecret',
      'realm'
    ]),
    handler: (argv) => updateManagedObjects(argv)
  })
  .command({
    command: 'remote-servers',
    desc: 'Update Remote Connector Servers (./config/connectors/remote-servers.json)',
    builder: cliOptions([
      'idmUsername',
      'idmPassword',
      'adminClientId',
      'adminClientSecret',
      'realm'
    ]),
    handler: (argv) => updateRemoteServers(argv)
  })
  .command({
    command: 'scripts',
    desc: 'Update AM Scripts (./config/am-scripts)',
    builder: cliOptions(['username', 'password', 'realm', 'filenameFilter']),
    handler: (argv) => updateScripts(argv)
  })
  .command({
    command: 'services',
    desc: 'Update AM Services (./config/services)',
    builder: cliOptions(['username', 'password', 'realm']),
    handler: (argv) => updateServices(argv)
  })
  .command({
    command: 'terms-and-conditions',
    desc: 'Update IDM Terms and Conditions (./config/consent/terms-and-conditions.json)',
    builder: cliOptions([
      'idmUsername',
      'idmPassword',
      'adminClientId',
      'adminClientSecret',
      'versionNumber',
      'realm'
    ]),
    handler: (argv) => updateTermsAndConditions(argv)
  })
  .command({
    command: 'password-policy',
    desc: 'Update IDM Password Policy for Alpha users (./config/password-policy/password-policy.json)',
    builder: cliOptions([
      'idmUsername',
      'idmPassword',
      'adminClientId',
      'adminClientSecret',
      'realm'
    ]),
    handler: (argv) => updatePasswordPolicy(argv)
  })
  .command({
    command: 'ui-config',
    desc: 'Update UI config (./config/ui/ui-config.json)',
    builder: cliOptions([
      'idmUsername',
      'idmPassword',
      'adminClientId',
      'adminClientSecret',
      'realm'
    ]),
    handler: (argv) => updateUiConfig(argv)
  })
  .command({
    command: 'user-roles',
    desc: 'Update IDM User Roles (./config/user-roles)',
    builder: cliOptions([
      'realm'
    ]),
    handler: (argv) => updateUserRoles(argv)
  })
  .command({
    command: 'idm-endpoints',
    desc: 'Update IDM Endpoints (./config/idm-endpoints)',
    builder: cliOptions([
      'idmUsername',
      'idmPassword',
      'adminClientId',
      'adminClientSecret',
      'realm',
      'filenameFilter'
    ]),
    handler: (argv) => updateIdmEndpoints(argv)
  })
  .command({
    command: 'idm-access-config',
    desc: 'Update IDM Access Configuration (./config/idm-access-config)',
    builder: cliOptions([
      'idmUsername',
      'idmPassword',
      'adminClientId',
      'adminClientSecret',
      'realm'
    ]),
    handler: (argv) => updateIdmAccessConfig(argv)
  })
  .command({
    command: 'get-managed-user',
    desc: 'Get Managed User',
    builder: cliOptions(['username', 'password', 'realm', 'managedUsername']),
    handler: (argv) => getManagedUser(argv)
  })
  .command({
    command: 'update-managed-users',
    desc: 'Update Managed Users (./config/managed-users)',
    builder: cliOptions(['realm', 'treeServiceUserPassword']),
    handler: (argv) => updateManagedUsers(argv)
  })
  .command({
    command: 'variables',
    desc: 'Update Variables (.env)',
    builder: cliOptions(['realm']),
    handler: (argv) => updateVariables(argv)
  })
  .command({
    command: 'secrets',
    desc: 'Update Secrets (.env)',
    builder: cliOptions(['realm']),
    handler: (argv) => updateSecrets(argv)
  })
  .command({
    command: 'restart-fidc',
    desc: 'Restart FIDC services',
    builder: cliOptions(['realm']),
    handler: (argv) => restartFidc(argv)
  })
  .command({
    command: 'esv-concourse',
    desc: 'Get Variables and Secrets (Concourse style)',
    builder: cliOptions(['regionName', 'decodeValue']),
    handler: (argv) => getEsvConcourse(argv)
  })
  .command({
    command: 'update-esv-and-optional-restart',
    desc: 'Update Variables and Secrets and Optinal Restart',
    builder: cliOptions(['realm']),
    handler: (argv) => updateEsvAndRestart(argv)
  })
  .demandCommand()
  .parse()
