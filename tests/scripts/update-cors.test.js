describe('update-cors', () => {
  jest.mock('node-fetch')
  const fetch = require('node-fetch')
  jest.mock('fs')
  const fs = require('fs')
  const path = require('path')
  jest.mock('../../helpers/get-access-token')
  jest.mock('../../helpers/get-session-token')
  const getSessionToken = require('../../helpers/get-session-token')
  const getAccessToken = require('../../helpers/get-access-token')
  const updateCors = require('../../scripts/update-cors/update-cors')
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(process, 'exit').mockImplementation(() => {})

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    sessionToken: 'session=1234',
    accessToken: 'blah',
    realm: '/realms/root/realms/alpha'
  }

  const mockPhase0ConfigFile = path.resolve(
    __dirname,
    '../../config/phase-0/cors/cors-config.json'
  )
  // const mockPhase1ConfigFile1 = path.resolve(
  //   __dirname,
  //   '../../config/phase-1/cors/cors-config.json'
  // )

  const mockPhase0Config = {
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
      acceptedMethods: ['HEAD', 'DELETE', 'POST', 'GET', 'OPTIONS', 'PUT', 'PATCH'],
      acceptedHeaders: ['authorization', 'accept-api-version', 'content-type', '*'],
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
      acceptedMethods: ['HEAD', 'DELETE', 'POST', 'GET', 'OPTIONS', 'PUT', 'PATCH'],
      acceptedHeaders: ['authorization', 'accept-api-version', 'content-type', '*'],
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
    fetch.mockImplementation(() =>
      Promise.resolve({
        status: 200,
        statusText: 'OK'
      })
    )
    getSessionToken.mockImplementation(() =>
      Promise.resolve(mockValues.sessionToken)
    )
    getAccessToken.mockImplementation(() =>
      Promise.resolve(mockValues.accessToken)
    )
    process.env.FIDC_URL = mockValues.fidcUrl
    delete process.env.PHASE
    fs.readdirSync.mockReturnValue(['cors-config.json'])
    jest.mock(mockPhase0ConfigFile, () => mockPhase0Config, { virtual: true })
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

  it('should error if missing FIDC_URL environment variable', async () => {
    expect.assertions(2)
    delete process.env.FIDC_URL
    await updateCors(mockValues)
    expect(console.error).toHaveBeenCalledWith(
      'Missing FIDC_URL environment variable'
    )
    expect(process.exit).toHaveBeenCalledWith(1)
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

  it('should call AM API with phase 0 config by default', async () => {
    expect.assertions(1)
    const expectedUrl = `${mockValues.fidcUrl}/am/json/global-config/services/CorsService`
    const expectedApiOptions = {
      method: 'put',
      headers: {
        'content-type': 'application/json',
        'x-requested-with': 'XMLHttpRequest',
        'Accept-API-Version': 'protocol=1.0,resource=1.0',
        cookie: mockValues.sessionToken
      },
      body: JSON.stringify(mockPhase0Config.corsServiceGlobal)
    }
    await updateCors(mockValues)
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedApiOptions)
  })

  it('should call AM API 2 with phase 0 config by default', async () => {
    expect.assertions(1)
    const expectedUrl = `${mockValues.fidcUrl}/am/json/global-config/services/CorsService/configuration/${mockPhase0Config.corsServiceConfig._id}`
    const expectedApiOptions = {
      method: 'put',
      headers: {
        'content-type': 'application/json',
        'x-requested-with': 'XMLHttpRequest',
        'Accept-API-Version': 'protocol=1.0,resource=1.0',
        cookie: mockValues.sessionToken
      },
      body: JSON.stringify(mockPhase0Config.corsServiceConfig)
    }
    await updateCors(mockValues)
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedApiOptions)
  })

  it('should call IDM API with phase 0 config by default', async () => {
    expect.assertions(1)
    const expectedUrl = `${mockValues.fidcUrl}/openidm/config/servletfilter/cors`
    const expectedApiOptions = {
      method: 'put',
      headers: {
        Authorization: `Bearer ${mockValues.accessToken}`,
        'Content-Type': 'application/json',
        'Accept-API-Version': 'resource=1.0'
      },
      body: JSON.stringify(mockPhase0Config.idmCorsConfig)
    }
    await updateCors(mockValues)
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedApiOptions)
  })

  it('should error if API response is not 200', async () => {
    fetch.mockImplementation(() =>
      Promise.resolve({
        status: 401,
        statusText: 'Unauthorized'
      })
    )
    await updateCors(mockValues)
    expect(process.exit).toHaveBeenCalledWith(1)
  })
})
