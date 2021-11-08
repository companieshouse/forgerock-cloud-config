describe('get-access-token', () => {
  jest.mock('node-fetch')
  const fetch = require('node-fetch')
  jest.spyOn(console, 'log').mockImplementation(() => {})

  const getAccessToken = require('../../helpers/get-access-token')

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    idmUsername: 'test-user',
    idmPassword: 'SecurePassword123',
    adminClientId: 'ForgeRockAdminClient',
    adminClientSecret: 'SecureClientSecret123',
    realm: 'alpha',
    accessToken: 'abcd-1234'
  }

  const expectedBody = new URLSearchParams()
  expectedBody.append('username', mockValues.idmUsername)
  expectedBody.append('password', mockValues.idmPassword)
  expectedBody.append('client_id', mockValues.adminClientId)
  expectedBody.append('client_secret', mockValues.adminClientSecret)
  expectedBody.append('grant_type', 'password')
  expectedBody.append('scope', 'fr:idm:*')

  beforeEach(() => {
    fetch.mockImplementation(() =>
      Promise.resolve({
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ access_token: mockValues.accessToken })
      })
    )
    process.env.FIDC_URL = mockValues.fidcUrl
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should call API with the correct options', async () => {
    const expectedUrl = `${mockValues.fidcUrl}/am/oauth2/realms/root/realms/${mockValues.realm}/access_token?auth_chain=PasswordGrant`
    const expectedApiOptions = {
      method: 'post',
      body: expectedBody
    }
    expect.assertions(2)
    await expect(getAccessToken(mockValues)).resolves.toEqual(
      mockValues.accessToken
    )
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedApiOptions)
  })

  it('should call API with the correct aliased options', async () => {
    const mockValuesAliased = {
      fidcUrl: 'https://fidc-test.forgerock.com',
      iu: 'test-user',
      ip: 'SecurePassword123',
      a: 'ForgeRockAdminClient',
      s: 'SecureClientSecret123',
      realm: 'alpha',
      accessToken: 'abcd-1234'
    }

    const expectedUrl = `${mockValuesAliased.fidcUrl}/am/oauth2/realms/root/realms/${mockValuesAliased.realm}/access_token?auth_chain=PasswordGrant`
    const expectedApiOptions = {
      method: 'post',
      body: expectedBody
    }
    expect.assertions(2)
    await expect(getAccessToken(mockValuesAliased)).resolves.toEqual(
      mockValuesAliased.accessToken
    )
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedApiOptions)
  })

  it('should change the realm if the realm argument is set', async () => {
    const updatedRealm = '/realms/root/realms/beta'

    const expectedUrl = `${mockValues.fidcUrl}/am/oauth2/realms/root/realms/${updatedRealm}/access_token?auth_chain=PasswordGrant`

    const expectedApiOptions = {
      method: 'post',
      body: expectedBody
    }

    mockValues.realm = updatedRealm

    expect.assertions(2)
    await expect(getAccessToken(mockValues)).resolves.toEqual(
      mockValues.accessToken
    )
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedApiOptions)
  })

  it('should reject if API request fails', async () => {
    const errorMessage = 'testing request failed'
    fetch.mockImplementation(() => Promise.reject(new Error(errorMessage)))

    await expect(getAccessToken(mockValues)).rejects.toEqual(
      new Error(errorMessage)
    )
  })

  it('should reject if API response is not 200', async () => {
    fetch.mockImplementation(() =>
      Promise.resolve({
        status: 401,
        statusText: 'Unauthorized'
      })
    )

    await expect(getAccessToken(mockValues)).rejects.toEqual(
      new Error('401: Unauthorized')
    )
  })
})
