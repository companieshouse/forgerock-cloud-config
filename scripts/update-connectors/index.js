#!/usr/bin/env node
const yargs = require('yargs')
const updateRemoteServers = require('./update-remote-servers')
const updateConnectorDefinitions = require('./update-connector-definitions')

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
    command: 'remote-servers',
    desc: 'remote-servers',
    handler: (argv) => updateRemoteServers(argv)
  })
  .command({
    command: 'definitions',
    desc: 'connector definitions',
    handler: (argv) => updateConnectorDefinitions(argv)
  })
  .parse()
