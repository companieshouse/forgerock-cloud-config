#!/usr/bin/env node
const yargs = require('yargs')
const cliOptions = require('./helpers/cli-options')
const { updateApplications } = require('./scripts')

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
  .demandCommand()
  .parse()
