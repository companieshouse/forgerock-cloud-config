const fetch = require("node-fetch");

const getAccessToken = async(argv) => {
  const { username, password, adminClientId, adminClientSecret, realm } = argv;

  // Check environment variables
  const { FRIC_URL } = process.env;

  if (!FRIC_URL) {
    console.error("Missing FRIC_URL environment variable");
    return process.exit(1);
  }

  // Get access token
  const requestUrl = `${FRIC_URL}/am/oauth2${realm}/access_token?auth_chain=PasswordGrant`;
  const body = new URLSearchParams();
  body.append("username", username);
  body.append("password", password);
  body.append("client_id", adminClientId);
  body.append("client_secret", adminClientSecret);
  body.append("grant_type", "password");
  body.append("scope", "fr:idm:*");

  const requestOptions = {
    method: "post",
    body,
  };

  try {
    const response = await fetch(requestUrl, requestOptions);
    if (response.status !== 200) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }
    const { access_token } = await response.json();
    console.log(access_token)
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

module.exports = getAccessToken;
