describe('update-cors', () => {
  jest.mock('fs')
  const fs = require('fs')
  const path = require('path')
  jest.mock('../../helpers/get-access-token')
  jest.mock('../../helpers/get-session-token')
  jest.mock('../../helpers/fidc-request')
  const getSessionToken = require('../../helpers/get-session-token')
  const getAccessToken = require('../../helpers/get-access-token')
  const fidcRequest = require('../../helpers/fidc-request')
  const updateCors = require('../../scripts/update-cors')
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(process, 'exit').mockImplementation(() => {})

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    sessionToken: 'session=1234',
    accessToken: 'blah',
    realm: 'alpha'
  }

  const mockConfigFile = path.resolve(
    __dirname,
    '../../config/cors/cors-config.json'
  )

  const mockConfig = {
    corsServiceGlobal: {
      enabled: true,
      _id: '',
      _type: {
        _id: 'CorsService',
        name: 'CORS Service',
        collection: false
      }
    },
    corsServiceConfig: {
      maxAge: 0,
      acceptedMethods: [
        'HEAD',
        'DELETE',
        'POST',
        'GET',
        'OPTIONS',
        'PUT',
        'PATCH'
      ],
      acceptedHeaders: [
        'authorization',
        'accept-api-version',
        'content-type',
        '*'
      ],
      enabled: true,
      acceptedOrigins: [
        'https://sdkapp.example.com:8443',
        'http://localhost:3000',
        'https://ui-amido-demo.forgeblocks.com',
        'https://example.com'
      ],
      allowCredentials: true,
      exposedHeaders: ['*'],
      _id: 'org-ui',
      _type: {
        _id: 'configuration',
        name: 'Cors Configuration',
        collection: true
      }
    },
    idmCorsConfig: {
      maxAge: 0,
      acceptedMethods: [
        'HEAD',
        'DELETE',
        'POST',
        'GET',
        'OPTIONS',
        'PUT',
        'PATCH'
      ],
      acceptedHeaders: [
        'authorization',
        'accept-api-version',
        'content-type',
        '*'
      ],
      enabled: true,
      acceptedOrigins: [
        'https://sdkapp.example.com:8443',
        'http://localhost:3000',
        'https://ui-amido-demo.forgeblocks.com',
        'https://example.com/stoca'
      ],
      allowCredentials: true,
      exposedHeaders: ['*'],
      _id: 'org-ui',
      _type: {
        _id: 'configuration',
        name: 'Cors Configuration',
        collection: true
      }
    }
  }

  beforeEach(() => {
    fidcRequest.mockImplementation(() => Promise.resolve())
    getSessionToken.mockImplementation(() =>
      Promise.resolve(mockValues.sessionToken)
    )
    getAccessToken.mockImplementation(() =>
      Promise.resolve(mockValues.accessToken)
    )
    process.env.FIDC_URL = mockValues.fidcUrl
    fs.readdirSync.mockReturnValue(['cors-config.json'])
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

  it('should error if getSessionToken functions fails', async () => {
    expect.assertions(2)
    const errorMessage = 'Invalid user'
    getSessionToken.mockImplementation(() =>
      Promise.reject(new Error(errorMessage))
    )
    await updateCors(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should error if getAccessToken functions fails', async () => {
    expect.assertions(2)
    const errorMessage = 'Invalid user'
    getAccessToken.mockImplementation(() =>
      Promise.reject(new Error(errorMessage))
    )
    await updateCors(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should call AM API using config file', async () => {
    expect.assertions(4)
    const expectedServiceUrl = `${mockValues.fidcUrl}/am/json/global-config/services/CorsService`
    const expectedServiceConfigUrl = `${expectedServiceUrl}/configuration/${mockConfig.corsServiceConfig._id}`
    const expectedIdmUrl = `${mockValues.fidcUrl}/openidm/config/servletfilter/cors`
    await updateCors(mockValues)
    expect(fidcRequest.mock.calls.length).toEqual(3)
    expect(fidcRequest.mock.calls[0]).toEqual([
      expectedServiceUrl,
      mockConfig.corsServiceGlobal,
      mockValues.sessionToken,
      true
    ])
    expect(fidcRequest.mock.calls[1]).toEqual([
      expectedServiceConfigUrl,
      mockConfig.corsServiceConfig,
      mockValues.sessionToken,
      true
    ])
    expect(fidcRequest.mock.calls[2]).toEqual([
      expectedIdmUrl,
      mockConfig.idmCorsConfig,
      mockValues.accessToken
    ])
  })

  it('should error if API request fails', async () => {
    expect.assertions(2)
    const errorMessage = 'testing request failed'
    fidcRequest.mockImplementation(() =>
      Promise.reject(new Error(errorMessage))
    )
    await updateCors(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })
})
