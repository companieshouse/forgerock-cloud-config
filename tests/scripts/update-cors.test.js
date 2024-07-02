describe('update-cors', () => {
  jest.mock('fs')
  const fs = require('fs')
  const path = require('path')
  jest.mock('../../helpers/get-access-token')
  jest.mock('../../helpers/get-session-token')
  jest.mock('../../helpers/fidc-request')
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
      _id: 'servletfilter/cors',
      classPathURLs: [],
      systemProperties: {},
      requestAttributes: {},
      scriptExtensions: {},
      initParams: {
        allowedOrigins: 'https://localhost:&{openidm.port.https},https://sdkapp.example.com:8443,http://localhost:8888',
        allowedMethods: 'GET,POST,PUT,DELETE,PATCH,OPTIONS,HEAD',
        allowedHeaders: 'accept,x-openidm-password,x-openidm-nosession,x-openidm-username,content-type,origin,x-requested-with,authorization',
        allowCredentials: true,
        chainPreflight: false
      },
      urlPatterns: ['/*'],
      filterClass: 'org.eclipse.jetty.servlets.CrossOriginFilter'
    }
  }

  beforeEach(() => {
    fidcRequest.mockImplementation(() => Promise.resolve())
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
    expect.assertions(2)
    const expectedIdmUrl = `${mockValues.fidcUrl}/openidm/config/servletfilter/cors`
    await updateCors(mockValues)
    expect(fidcRequest.mock.calls.length).toEqual(1)
    expect(fidcRequest.mock.calls[0]).toEqual([
      expectedIdmUrl,
      mockConfig.idmCorsConfig,
      mockValues.accessToken,
      false
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
