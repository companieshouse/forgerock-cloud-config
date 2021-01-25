describe("get-access-token", () => {
  jest.mock("node-fetch");
  const fetch = require("node-fetch");

  const getAccessToken = require("./get-access-token");

  const mockValues = {
    fricUrl: "https://fric-test.forgerock.com",
    username: "test-user",
    password: "SecurePassword123",
    adminClientId: "ForgeRockAdminClient",
    adminClientSecret: "SecureClientSecret123",
    realm: "/realms/root/realms/alpha",
    accessToken: "abcd-1234"
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
        json: () => Promise.resolve({ access_token: mockValues.accessToken }),
      })
    );
    process.env.FRIC_URL = mockValues.fricUrl;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("should reject if missing FRIC environment variable", async() => {
    delete process.env.FRIC_URL;
    expect.assertions(1);
    await expect(getAccessToken(mockValues)).rejects.toEqual(new Error("Missing FRIC_URL environment variable"));
  });

  it("should call API with the correct options", async() => {
    const expectedUrl = `${mockValues.fricUrl}/am/oauth2${mockValues.realm}/access_token?auth_chain=PasswordGrant`
    const expectedApiOptions = {
      method: "post",
      body: expectedBody,
    };
    expect.assertions(2);
    await expect(getAccessToken(mockValues)).resolves.toEqual(mockValues.accessToken);
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

    expect.assertions(2);
    await expect(getAccessToken(mockValues)).resolves.toEqual(mockValues.accessToken);
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedApiOptions);
  });

  it("should reject if API request fails", async () => {
    const errorMessage = "testing request failed";
    fetch.mockImplementation(() => Promise.reject(new Error(errorMessage)));

    await expect(getAccessToken(mockValues)).rejects.toEqual(new Error(errorMessage));
  });
  
  it("should reject if API response is not 200", async () => {
    fetch.mockImplementation(() => Promise.resolve({
      status: 401,
      statusText: 'Unauthorized',
    }));

    await expect(getAccessToken(mockValues)).rejects.toEqual(new Error("401: Unauthorized"));
  });
});
