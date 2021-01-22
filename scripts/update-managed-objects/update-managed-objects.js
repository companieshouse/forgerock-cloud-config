const fetch = require('node-fetch');
const fs = require("fs")
const path = require("path");

const updateManagedObjects = async(argv) => {
  const { token } = argv;

  // Check environment variables
  const { FRIC_URL, PHASE = "0" } = process.env;

  if (!FRIC_URL) {
    console.error("Missing FRIC_URL environment variable");
    return process.exit(1);
  }

  console.log(`Using phase ${PHASE} config`);

  // Combine managed object JSON files
  const dir = path.resolve(__dirname, `../../config/phase-${PHASE}/managed-objects`);

  const managedObjects = fs.readdirSync(dir)
    .filter((name) => path.extname(name) === ".json") // Filter out any non JSON files
    .map((filename) => require(path.join(dir, filename))); // Map JSON file content to an array

  // Update all managed objects
  const requestUrl = `${FRIC_URL}/openidm/config/managed`;

  const requestOptions = {
    method: "put",
    body: JSON.stringify({
      objects: managedObjects
    }),
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    }
  };

  try {
    const {status, statusText} = await fetch(requestUrl, requestOptions);
    if (status !== 200) {
      console.error(`${status}: ${statusText}`);
      process.exit(1);
    }
    console.log("Managed objects updated");
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = updateManagedObjects;