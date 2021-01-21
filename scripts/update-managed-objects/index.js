#!/usr/bin/env node
const request = require("request-promise");
const yargs = require("yargs");
const fs = require("fs")
const path = require("path");

// Script arguments
const argv = yargs
  .usage("Usage: $0 [arguments]")
  .version(false)
  .help("h")
  .alias("h", "help")
  .demandOption(["t"])
  .alias("t", "token")
  .describe("t", "Access Token")
  .parse(process.argv);

const { token } = argv;

// Check environment variables
const { FRIC_URL, PHASE = "0" } = process.env;

if (!FRIC_URL) {
  console.error("Missing FRIC_URL environment variable");
  process.exit(1);
}

console.log(`Using phase ${PHASE} config`);

// Combine managed object JSON files
const dir = path.resolve(__dirname, `../../config/phase-${PHASE}/managed-objects`);

const managedObjects = fs.readdirSync(dir)
  .filter((name) => path.extname(name) === ".json") // Filter out any non JSON files
  .map((filename) => require(path.join(dir, filename))); // Map JSON file content to an array

// Update all managed objects
const requestOptions = {
  uri: `${FRIC_URL}/openidm/config/managed`,
  method: "PUT",
  headers: {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  json: true,
  body: {
    objects: managedObjects
  },
};

request(requestOptions)
  .then(() => {
    console.log("Managed objects updated");
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
