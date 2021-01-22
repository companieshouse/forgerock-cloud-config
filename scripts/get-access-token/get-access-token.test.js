describe("get-access-token", () => {
  jest.mock("node-fetch");
  const fetch = require("node-fetch");
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(process, "exit").mockImplementation(() => {});

  const getAccessToken = require("./get-access-token");

  const mockValues = {
    fricUrl: "https://fric-test.forgerock.com",
    username: "test-user",
    password: "SecurePassword123",
    adminClientId: "ForgeRockAdminClient",
    adminClientSecret: "SecureClientSecret123",
    realm: "/realms/root/realms/alpha",
  };

  const expectedBody = new URLSearchParams();
  expectedBody.append("username", mockValues.username);
  expectedBody.append("password", mockValues.password);
  expectedBody.append("client_id", mockValues.adminClientId);
  expectedBody.append("client_secret", mockValues.adminClientSecret);
  expectedBody.append("grant_type", "password");
  expectedBody.append("scope", "fr:idm:*");

  beforeEach(() => {
    fetch.mockImplementation(() =>
      Promise.resolve({
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ access_token: "abcd-1234" }),
      })
    );
    process.env.FRIC_URL = mockValues.fricUrl;
  });

  afterEach(() => {
    jest.resetAllMocks();
    console.log.mockClear();
    console.error.mockClear();
    process.exit.mockClear();
  });

  afterAll(() => {
    console.log.mockRestore();
    console.error.mockRestore();
    process.exit.mockRestore();
  });

  it("should error if missing FRIC environment variable", async() => {
    delete process.env.FRIC_URL;
    await getAccessToken(mockValues);
    expect(console.error).toHaveBeenCalledWith(
      "Missing FRIC_URL environment variable"
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("should call API with the correct options", async() => {
    const expectedUrl = `${mockValues.fricUrl}/am/oauth2${mockValues.realm}/access_token?auth_chain=PasswordGrant`
    const expectedApiOptions = {
      method: "post",
      body: expectedBody,
    };
    await getAccessToken(mockValues);
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedApiOptions);
  });

  it("should change the realm if the realm argument is set", async() => {
    const updatedRealm = "/realms/root/realms/beta";

    const expectedUrl = `${mockValues.fricUrl}/am/oauth2${updatedRealm}/access_token?auth_chain=PasswordGrant`

    const expectedApiOptions = {
      method: "post",
      body: expectedBody,
    };

    mockValues.realm = updatedRealm;

    await getAccessToken(mockValues);
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedApiOptions);
  });

  it("should error if API request fails", async () => {
    const errorMessage = "testing request failed";
    fetch.mockImplementation(() => Promise.reject(new Error(errorMessage)));

    await getAccessToken(mockValues);
    expect(console.error).toHaveBeenCalledWith(errorMessage);
    expect(process.exit).toHaveBeenCalledWith(1);
  });
  
  it("should error if API response is not 200", async () => {
    fetch.mockImplementation(() => Promise.resolve({
      status: 401,
      statusText: 'Unauthorized',
    }));

    await getAccessToken(mockValues);
    expect(console.error).toHaveBeenCalledWith("401: Unauthorized");
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
