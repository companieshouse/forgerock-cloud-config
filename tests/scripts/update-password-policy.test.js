describe('update-password-policy', () => {
  const path = require('path')
  jest.mock('../../helpers/get-access-token')
  const getAccessToken = require('../../helpers/get-access-token')
  jest.mock('../../helpers/fidc-request')
  const fidcRequest = require('../../helpers/fidc-request')
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(process, 'exit').mockImplementation(() => {})

  const updatePasswordPolicy = require('../../scripts/update-password-policy')

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    accessToken: 'forgerock-token'
  }

  const mockConfigFile = path.resolve(
    __dirname,
    '../../config/password-policy/password-policy.json'
  )

  const mockConfig = {
    _id: 'fieldPolicy/alpha_user',
    type: 'password-policy',
    validator: [
      {
        _id: 'alpha_userPasswordPolicy-length-based-password-validator',
        type: 'length-based',
        enabled: true,
        maxPasswordLength: 64,
        minPasswordLength: 8
      },
      {
        _id: 'alpha_userPasswordPolicy-repeated-characters-password-validator',
        type: 'repeated-characters',
        enabled: true,
        caseSensitiveValidation: true,
        maxConsecutiveLength: 2
      }
    ],
    defaultPasswordStorageScheme: [
      {
        _id: 'PBKDF2-HMAC-SHA256'
      }
    ],
    passwordAttribute: 'password',
    resourceCollection: 'managed/alpha_user'
  }

  const expectedUrl = `${mockValues.fidcUrl}/openidm/config/fieldPolicy/alpha_user`

  beforeEach(() => {
    fidcRequest.mockImplementation(() => Promise.resolve())
    getAccessToken.mockImplementation(() =>
      Promise.resolve(mockValues.accessToken)
    )
    process.env.FIDC_URL = mockValues.fidcUrl
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
    await updatePasswordPolicy(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should call API using config file', async () => {
    expect.assertions(2)
    await updatePasswordPolicy(mockValues)
    expect(fidcRequest.mock.calls.length).toEqual(1)
    expect(fidcRequest).toHaveBeenCalledWith(
      expectedUrl,
      mockConfig,
      mockValues.accessToken
    )
  })

  it('should error if API request fails', async () => {
    expect.assertions(2)
    const errorMessage = 'Something went wrong'
    fidcRequest.mockImplementation(() =>
      Promise.reject(new Error(errorMessage))
    )
    await updatePasswordPolicy(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })
})
