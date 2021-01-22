#!/usr/bin/env node
const yargs = require("yargs");
const updateManagedObjects = require("./update-managed-objects")

// Script arguments
const argv = yargs
  .usage("Usage: $0 [arguments]")
  .version(false)
  .help("h")
  .alias("h", "help")
  .demandOption(["t"])
  .alias("t", "token")
  .describe("t", "Access Token")
  .command({
    command: "$0",
    desc: "default",
    handler: (argv) => updateManagedObjects(argv),
  }).argv;