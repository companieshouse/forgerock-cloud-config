#!/usr/bin/env node
const yargs = require('yargs')
const updateCors = require('./update-cors')

// Script arguments
yargs
  .usage('Usage: $0 [arguments]')
  .version(false)
  .help('h')
  .alias('h', 'help')
  .alias('u', 'username')
  .alias('p', 'password')
  .describe('u', 'Tenant Admin Email')
  .describe('p', 'Tenant Admin Password')
  .alias('iu', 'idmusername')
  .alias('ip', 'idmpassword')
  .alias('a', 'adminClientId')
  .alias('s', 'adminClientSecret')
  .describe('iu', 'IDM admin username')
  .describe('ip', 'IDM Admin password')
  .describe('a', 'Admin Client ID')
  .describe('s', 'Admin Client Secret')
  .demandOption(['u', 'p', 'iu', 'ip', 'a', 's'])
  .command({
    command: '$0',
    desc: 'default',
    handler: (argv) => updateCors(argv)
  })
  .parse()
