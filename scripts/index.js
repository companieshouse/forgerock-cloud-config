#!/usr/bin/env node
const yargs = require('yargs')
const scripts = require('./scripts')

// Script arguments
yargs
  .usage('Usage: $0 [arguments]')
  .version(false)
  .help('h')
  .alias('h', 'help')
  .alias('u', 'username')
  .alias('p', 'password')
  .alias('a', 'adminClientId')
  .alias('s', 'adminClientSecret')
  .alias('r', 'realm')
  .default('r', '/realms/root/realms/alpha')
  .describe('u', 'Username')
  .describe('p', 'Password')
  .describe('a', 'Admin Client ID')
  .describe('s', 'Admin Client Secret')
  .describe('r', 'Realm')
  .demandOption(['u', 'p', 'a', 's'])
  .command({
    command: 'auth-trees',
    desc: 'auth trees',
    handler: (argv) => scripts.updateAuthTrees(argv)
  })
  .command({
    command: 'connector-definitions',
    desc: 'connector definitions',
    handler: (argv) => scripts.updateConnectorDefinitions(argv)
  })
  .command({
    command: 'connector-mappings',
    desc: 'connector mappings',
    handler: (argv) => scripts.updateConnectorMappings(argv)
  })
  .command({
    command: 'cors',
    desc: 'cors',
    handler: (argv) => scripts.updateCors(argv)
  })
  .command({
    command: 'internal-roles',
    desc: 'internal roles',
    handler: (argv) => scripts.updateInternalRoles(argv)
  })
  .command({
    command: 'managed-objects',
    desc: 'managed objects',
    handler: (argv) => scripts.updateManagedObjects(argv)
  })
  .command({
    command: 'remote-servers',
    desc: 'remote servers',
    handler: (argv) => scripts.updateRemoteServers(argv)
  })
  .command({
    command: 'scripts',
    desc: 'scripts',
    handler: (argv) => scripts.updateScripts(argv)
  })
  .command({
    command: 'terms',
    desc: 'terms and conditions',
    handler: (argv) => scripts.updateTermsAndConditions(argv)
  })
  .command({
    command: 'user-roles',
    desc: 'user roles',
    handler: (argv) => scripts.updateUserRoles(argv)
  })
  .parse()
