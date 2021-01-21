let request;

// CLI call function
const { execSync } = require("child_process");
const cliCall = (args) => {
  try {
    return execSync(`get-access-token ${args}`, {
      env: process.env,
    }).toString();
  } catch (error) {
    return error.message;
  }
};

const requiredArguments = "u, p, a, s";

const mockValues = {
  fricUrl: "https://fric-test.forgerock.com",
  username: "test-user",
  password: "SecurePassword123",
  adminClient: "ForgeRockAdminClient",
  adminSecret: "SecureClientSecret123",
  realm: "/realms/root/realms/alpha",
};

const mockRequiredArguments = `-u ${mockValues.username} -p ${mockValues.password} -a ${mockValues.adminClient} -s ${mockValues.adminSecret}`;

const expectedApiOptions = {
  uri: `${mockValues.fricUrl}/am/oauth2${mockValues.realm}/access_token?auth_chain=PasswordGrant`,
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
  json: true,
  form: {
    username: mockValues.username,
    password: mockValues.password,
    client_id: mockValues.adminClient,
    client_secret: mockValues.adminSecret,
    grant_type: "password",
    scope: "fr:idm:*",
  },
};

describe("get-access-token", () => {
  beforeEach(() => {
    jest.resetModules();
    request = require("request-promise");
    jest.mock("request-promise");
    process.env.FRIC_URL = mockValues.fricUrl;
  });

  it("should error if required arguments are missing", () => {
    expect(cliCall("--fake-argument")).toContain(
      `Missing required arguments: ${requiredArguments}`
    );
  });

  it("should error if missing FRIC environment variable", () => {
    delete process.env.FRIC_URL;
    expect(cliCall(mockRequiredArguments)).toContain(
      `Missing FRIC_URL environment variable`
    );
  });

  it("should call API with the correct options", () => {
    request.mockImplementation(() =>
      Promise.resolve({ access_token: "abcd-1234" })
    );
    process.argv = mockRequiredArguments.split(" ");
    require("./index.js");
    expect(request).toHaveBeenCalledWith(expectedApiOptions);
  });

  it("should change the realm if the realm argument is set", () => {
    request.mockImplementation(() =>
      Promise.resolve({ access_token: "abcd-1234" })
    );
    const realm = "/realms/root/realms/beta";
    process.argv = mockRequiredArguments.split(" ");
    process.argv.push("-r", realm);
    (expectedApiOptions.uri = `${mockValues.fricUrl}/am/oauth2${realm}/access_token?auth_chain=PasswordGrant`),
      require("./index.js");
    expect(request).toHaveBeenCalledWith(expectedApiOptions);
  });

  it("should error if API request fails", () => {
    const errorMessage = "testing request failed";
    request.mockImplementation(() => Promise.reject(new Error(errorMessage)));
    jest.spyOn(process, "exit").mockImplementation(() => {});
    process.argv = mockRequiredArguments.split(" ");
    require("./index.js");
    expect(request).rejects.toThrow(errorMessage);
  });
});
