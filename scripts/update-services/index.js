#!/usr/bin/env node
const yargs = require('yargs')
const updateServices = require('./update-services')

// Script arguments
yargs
  .usage('Usage: $0 [arguments]')
  .version(false)
  .help('h')
  .alias('h', 'help')
  .alias('u', 'username')
  .alias('p', 'password')
  .alias('r', 'realm')
  .alias('hs', 'hash_salt')
  .default('r', '/realms/root/realms/alpha')
  .describe('u', 'Username')
  .describe('p', 'Password')
  .describe('r', 'Realm')
  .describe('hs', 'OAuth2 Hash Salt')
  .demandOption(['u', 'p', 'hs'])
  .command({
    command: '$0',
    desc: 'default',
    handler: (argv) => updateServices(argv)
  })
  .parse()
