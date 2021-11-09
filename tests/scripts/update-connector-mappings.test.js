describe('update-connector-mappings', () => {
  jest.mock('fs')
  const fs = require('fs')
  const path = require('path')
  jest.mock('../../helpers/get-access-token')
  const getAccessToken = require('../../helpers/get-access-token')
  jest.mock('../../helpers/fidc-request')
  const fidcRequest = require('../../helpers/fidc-request')
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(process, 'exit').mockImplementation(() => {})

  const updateConnectorMappings = require('../../scripts/update-connector-mappings')

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    accessToken: 'forgerock-token'
  }

  const mockConfigFile = path.resolve(
    __dirname,
    '../../config/connectors/mappings/mongodb-users.json'
  )

  const mockConfig = {
    consentRequired: false,
    displayName: 'MongodbUsers',
    icon: null,
    name: 'MongodbUsers',
    properties: [
      {
        source: 'email',
        target: 'mail'
      },
      {
        source: 'email',
        target: 'userName'
      },
      {
        source: 'forename',
        target: 'givenName'
      },
      {
        source: 'surname',
        target: 'sn'
      }
    ]
  }

  const mockConfigWithScript = {
    consentRequired: false,
    displayName: 'MongodbUsers',
    icon: null,
    name: 'MongodbUsers',
    properties: [
      {
        source: 'email',
        target: 'mail'
      },
      {
        source: 'email',
        target: 'userName'
      },
      {
        source: 'forename',
        target: 'givenName'
      },
      {
        source: 'surname',
        target: 'sn'
      }
    ],
    onCreate: {
      source: 'my script'
    },
    onError: {
      source: 'my script'
    },
    onUpdate: {
      source: 'my script'
    }
  }

  const expectedUrl = `${mockValues.fidcUrl}/openidm/config/sync`

  beforeEach(() => {
    fidcRequest.mockImplementation(() => Promise.resolve())
    getAccessToken.mockImplementation(() =>
      Promise.resolve(mockValues.accessToken)
    )
    process.env.FIDC_URL = mockValues.fidcUrl
    fs.readdirSync.mockReturnValue(['mongodb-users.json'])
    jest.mock(mockConfigFile, () => mockConfig, { virtual: true })
  })

  afterEach(() => {
    jest.resetAllMocks()
    console.log.mockClear()
    console.error.mockClear()
    process.exit.mockClear()
  })

  afterAll(() => {
    console.log.mockRestore()
    console.error.mockRestore()
    process.exit.mockRestore()
  })

  it('should error if getAccessToken functions fails', async () => {
    expect.assertions(2)
    const errorMessage = 'Invalid user'
    getAccessToken.mockImplementation(() =>
      Promise.reject(new Error(errorMessage))
    )
    await updateConnectorMappings(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should call API using config file merging scripts', async () => {
    expect.assertions(2)
    const expectedBody = { mappings: [mockConfig] }

    fs.existsSync.mockReturnValue(true)
    fs.readFileSync.mockReturnValue('my script')

    await updateConnectorMappings(mockValues)
    expect(fidcRequest.mock.calls.length).toEqual(1)
    expect(fidcRequest).toHaveBeenCalledWith(
      expectedUrl,
      expectedBody,
      mockValues.accessToken
    )
  })

  it('should call API using config file merging scripts where exists', async () => {
    expect.assertions(2)
    const expectedBody = { mappings: [mockConfigWithScript] }

    fs.existsSync.mockReturnValue(true)
    fs.readFileSync.mockReturnValue('my script')

    await updateConnectorMappings(mockValues)
    expect(fidcRequest.mock.calls.length).toEqual(1)
    expect(fidcRequest).toHaveBeenCalledWith(
      expectedUrl,
      expectedBody,
      mockValues.accessToken
    )
  })

  it('should call API using config file', async () => {
    expect.assertions(2)
    const expectedBody = { mappings: [mockConfig] }
    await updateConnectorMappings(mockValues)
    expect(fidcRequest.mock.calls.length).toEqual(1)
    expect(fidcRequest).toHaveBeenCalledWith(
      expectedUrl,
      expectedBody,
      mockValues.accessToken
    )
  })

  it('should error if API request fails', async () => {
    expect.assertions(2)
    const errorMessage = 'testing request failed'
    fidcRequest.mockImplementation(() =>
      Promise.reject(new Error(errorMessage))
    )
    await updateConnectorMappings(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })
})
