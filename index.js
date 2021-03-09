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
  updateTermsAndConditions
} = require('./scripts')

if (!process.env.FIDC_URL) {
  console.error('Missing FIDC_URL environment variable')
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
    desc: 'Update ForgeRock Applications',
    builder: cliOptions(['username', 'password', 'realm']),
    handler: (argv) => updateApplications(argv)
  })
  .command({
    command: 'auth-trees',
    desc: 'Update AM Auth Trees',
    builder: cliOptions(['username', 'password', 'realm']),
    handler: (argv) => updateAuthTrees(argv)
  })
  .command({
    command: 'connector-definitions',
    desc: 'Update IDM Connector Definitions',
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
    desc: 'Update IDM Connector Mappings',
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
    desc: 'Update ForgeRock CORS',
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
    desc: 'Update IDM Internal Roles',
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
    desc: 'Update IDM Managed Objects',
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
    desc: 'Update Remote Connector Servers',
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
    desc: 'Update AM Scripts',
    builder: cliOptions(['username', 'password', 'realm']),
    handler: (argv) => updateScripts(argv)
  })
  .command({
    command: 'services',
    desc: 'Update AM Services',
    builder: cliOptions(['username', 'password', 'realm', 'hashSalt']),
    handler: (argv) => updateServices(argv)
  })
  .command({
    command: 'terms-and-conditions',
    desc: 'Update IDM Terms and Conditions',
    builder: cliOptions([
      'idmUsername',
      'idmPassword',
      'adminClientId',
      'adminClientSecret',
      'realm'
    ]),
    handler: (argv) => updateTermsAndConditions(argv)
  })
  .demandCommand()
  .parse()
