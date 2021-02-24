#!/usr/bin/env node
const yargs = require('yargs')
const updateApplications = require('./update-applications')

// Script arguments
yargs
  .usage('Usage: $0 [arguments]')
  .version(false)
  .help('h')
  .alias('h', 'help')
  .alias('u', 'username')
  .alias('p', 'password')
  .alias('r', 'realm')
  .default('r', '/realms/root/realms/alpha')
  .describe('u', 'Username')
  .describe('p', 'Password')
  .describe('r', 'Realm')
  .demandOption(['u', 'p'])
  .command({
    command: '$0',
    desc: 'default',
    handler: (argv) => updateApplications(argv)
  })
  .parse()
