#!/usr/bin/env node
const yargs = require('yargs')
const cliOptions = require('./helpers/cli-options')
const {
  updateApplications,
  updateAuthTrees,
  updateConnectorDefinitions,
  updateConnectorMappings,
  updateCors,
  updateRemoteServers,
  updateScripts
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
    builder: cliOptions(['idmUsername', 'idmPassword', 'realm']),
    handler: (argv) => updateConnectorDefinitions(argv)
  })
  .command({
    command: 'connector-mappings',
    desc: 'Update IDM Connector Mappings',
    builder: cliOptions(['idmUsername', 'idmPassword', 'realm']),
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
      'realm'
    ]),
    handler: (argv) => updateCors(argv)
  })
  .command({
    command: 'remote-servers',
    desc: 'Update Remote Connector Servers',
    builder: cliOptions(['idmUsername', 'idmPassword', 'realm']),
    handler: (argv) => updateRemoteServers(argv)
  })
  .command({
    command: 'scripts',
    desc: 'Update AM Scripts',
    builder: cliOptions(['username', 'password', 'realm']),
    handler: (argv) => updateScripts(argv)
  })
  .demandCommand()
  .parse()
