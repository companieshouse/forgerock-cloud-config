const request = require("request-promise");

// Script arguments
const argv = require("yargs")
  .usage("Usage: $0 [arguments]")
  .version(false)
  .help("h")
  .alias("h", "help")
  .alias("u", "username")
  .alias("p", "password")
  .alias("a", "adminClientId")
  .alias("s", "adminClientSecret")
  .alias("r", "realm")
  .default("r", "/realms/root/realms/alpha")
  .describe("u", "Username")
  .describe("p", "Password")
  .describe("a", "Admin Client ID")
  .describe("s", "Admin Client Secret")
  .describe("r", "Realm")
  .demandOption(["u", "p", "a", "s"]).argv;

const { username, password, adminClientId, adminClientSecret, realm } = argv;

// Check environment variables
const { FRIC_URL } = process.env;

if (!FRIC_URL) {
  console.error("Missing FRIC_URL environment variable");
  process.exit(1);
}

// Get access token
const requestOptions = {
  uri: `${FRIC_URL}/am/oauth2${realm}/access_token?auth_chain=PasswordGrant`,
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
  json: true,
  form: {
    username,
    password,
    client_id: adminClientId,
    client_secret: adminClientSecret,
    grant_type: "password",
    scope: "fr:idm:*",
  },
};

request(requestOptions)
  .then(({ access_token}) => {
    console.log(access_token);
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
