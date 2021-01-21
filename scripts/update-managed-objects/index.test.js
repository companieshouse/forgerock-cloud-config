const path = require("path");
let fs;
let request;

// CLI call function
const { execSync } = require("child_process");
const cliCall = (args) => {
  try {
    return execSync(`update-managed-objects ${args}`, {
      env: process.env,
    }).toString();
  } catch (error) {
    return error.message;
  }
};

const requiredArguments = "t";

const mockValues = {
  fricUrl: "https://fric-test.forgerock.com",
  token: "forgerock-token",
};

const mockRequiredArguments = `-t ${mockValues.token}`;

const mockPhase0ConfigFile = path.resolve(
  __dirname,
  `../../config/phase-0/managed-objects/user.json`
);
const mockPhase1ConfigFile = path.resolve(
  __dirname,
  `../../config/phase-1/managed-objects/user.json`
);

const mockPhase0Config = {
  iconClass: "fa fa-database",
  name: "user",
  schema: {
    order: ["userName", "password"],
    properties: {
      password: {
        description: "Password",
        type: "string",
      },
      userName: {
        description: "Username",
        type: "string",
      },
    },
    required: ["userName", "password"],
    title: "User",
    type: "object",
  },
  type: "Managed Object",
};

const mockPhase1Config = {
  iconClass: "fa fa-database",
  name: "user",
  schema: {
    order: ["userName", "password"],
    properties: {
      password: {
        description: "Password",
        type: "string",
      },
      userName: {
        description: "Username",
        type: "string",
      },
      company: {
        description: "Company",
        type: "relationship",
      },
    },
    required: ["userName", "password", "company"],
    title: "User",
    type: "object",
  },
  type: "Managed Object",
};

describe("update-managed-objects", () => {
  beforeEach(() => {
    jest.resetModules();
    request = require("request-promise");
    jest.mock("request-promise");
    process.env.FRIC_URL = mockValues.fricUrl;
    delete process.env.PHASE;
    fs = require("fs");
    jest.mock("fs");
    fs.readdirSync.mockReturnValue(["user.json"]);
    jest.mock(
      mockPhase0ConfigFile,
      () => mockPhase0Config,
      { virtual: true }
    );
    jest.mock(
      mockPhase1ConfigFile,
      () => mockPhase1Config,
      { virtual: true }
    );
  });

  it("should error if required arguments are missing", () => {
    expect(cliCall("--fake-argument")).toContain(
      `Missing required argument: ${requiredArguments}`
    );
  });

  it("should error if missing FRIC environment variable", () => {
    delete process.env.FRIC_URL;
    expect(cliCall(mockRequiredArguments)).toContain(
      `Missing FRIC_URL environment variable`
    );
  });

  it("should call API with phase 0 config by default", () => {
    const expectedApiOptions = {
      uri: `${mockValues.fricUrl}/openidm/config/managed`,
      method: "PUT",
      headers: {
        Authorization: `Bearer ${mockValues.token}`,
        "Content-Type": "application/json",
      },
      json: true,
      body: {
        objects: [mockPhase0Config],
      },
    };
    request.mockImplementation(() => Promise.resolve());
    process.argv = mockRequiredArguments.split(" ");
    require("./index.js");
    expect(request).toHaveBeenCalledWith(expectedApiOptions);
  });
  
  it("should call API with phase config by environment variable", () => {
    process.env.PHASE = 1;
    const expectedApiOptions = {
      uri: `${mockValues.fricUrl}/openidm/config/managed`,
      method: "PUT",
      headers: {
        Authorization: `Bearer ${mockValues.token}`,
        "Content-Type": "application/json",
      },
      json: true,
      body: {
        objects: [mockPhase1Config],
      },
    };
    request.mockImplementation(() => Promise.resolve());
    process.argv = mockRequiredArguments.split(" ");
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
