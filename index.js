#!/usr/bin/env node
const yargs = require('yargs')
const cliOptions = require('./helpers/cli-options')
const {
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
} = require('./scripts')

require('dotenv').config()

if (
  !process.env.FIDC_URL ||
  !process.env.UI_URL ||
  !process.env.OAUTH2_HASH_SALT
) {
  console.error('Missing required environment variable(s)')
  process.exit(1)
}

// Script arguments
yargs
  .usage('Usage: $0 [arguments]')
  .version(false)
  .help('h')
  .alias('h', 'help')
  .command({
    command: 'applications',
    desc: 'Update ForgeRock Applications (./config/applications)',
    builder: cliOptions(['username', 'password', 'realm']),
    handler: (argv) => updateApplications(argv)
  })
  .command({
    command: 'auth-trees',
    desc: 'Update AM Auth Trees (./config/auth-trees)',
    builder: cliOptions(['username', 'password', 'realm']),
    handler: (argv) => updateAuthTrees(argv)
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
    command: 'cors',
    desc: 'Update ForgeRock CORS (./config/cors)',
    builder: cliOptions([
      'username',
      'password',
      'idmUsername',
      'idmPassword',
      'adminClientId',
      'adminClientSecret',
      'realm'
    ]),
    handler: (argv) => updateCors(argv)
  })
  .command({
    command: 'internal-roles',
    desc: 'Update IDM Internal Roles (./config/internal-roles)',
    builder: cliOptions([
      'idmUsername',
      'idmPassword',
      'adminClientId',
      'adminClientSecret',
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
    desc:
      'Update Remote Connector Servers (./config/connectors/remote-servers.json)',
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
    builder: cliOptions(['username', 'password', 'realm']),
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
    desc:
      'Update IDM Terms and Conditions (./config/consent/terms-and-conditions.json)',
    builder: cliOptions([
      'idmUsername',
      'idmPassword',
      'adminClientId',
      'adminClientSecret',
      'realm'
    ]),
    handler: (argv) => updateTermsAndConditions(argv)
  })
  .command({
    command: 'user-roles',
    desc: 'Update IDM User Roles (./config/user-roles)',
    builder: cliOptions([
      'idmUsername',
      'idmPassword',
      'adminClientId',
      'adminClientSecret',
      'realm'
    ]),
    handler: (argv) => updateUserRoles(argv)
  })
  .demandCommand()
  .parse()
