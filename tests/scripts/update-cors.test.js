describe('update-cors', () => {
  jest.mock('fs')
  const fs = require('fs')
  const path = require('path')
  jest.mock('../../helpers/get-service-account-token')
  jest.mock('../../helpers/fidc-request')
  const getServiceAccountToken = require('../../helpers/get-service-account-token')
  const fidcRequest = require('../../helpers/fidc-request')
  const updateCors = require('../../scripts/update-cors')
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(process, 'exit').mockImplementation(() => {})

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    accessToken: 'forgerock-token',
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
    getServiceAccountToken.mockImplementation(() =>
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

  it('should error if getServiceAccountToken functions fails', async () => {
    expect.assertions(2)
    const errorMessage = 'Invalid user'
    getServiceAccountToken.mockImplementation(() =>
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
      mockValues.accessToken,
      false
    ])
    expect(fidcRequest.mock.calls[1]).toEqual([
      expectedServiceConfigUrl,
      mockConfig.corsServiceConfig,
      mockValues.accessToken,
      false
    ])
    expect(fidcRequest.mock.calls[2]).toEqual([
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
