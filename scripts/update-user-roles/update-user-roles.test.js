describe('update-user-roles', () => {
  jest.mock('node-fetch')
  const fetch = require('node-fetch')
  jest.mock('fs')
  const fs = require('fs')
  const path = require('path')
  jest.mock('../helpers/get-access-token')
  const getAccessToken = require('../helpers/get-access-token')
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(process, 'exit').mockImplementation(() => {})

  const updateUserRoles = require('./update-user-roles')

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    accessToken: 'forgerock-token'
  }

  const mockPhase0ConfigFile = path.resolve(
    __dirname,
    '../../config/phase-0/user-roles/lender.json'
  )
  const mockPhase1ConfigFile1 = path.resolve(
    __dirname,
    '../../config/phase-1/user-roles/lender.json'
  )
  const mockPhase1ConfigFile2 = path.resolve(
    __dirname,
    '../../config/phase-1/user-roles/presenter.json'
  )

  const mockPhase0Config = {
    _id: 'abcd',
    name: 'Lender',
    description: 'A lender can file for any company',
    realm: 'alpha'
  }

  const mockPhase1Config = {
    _id: '1234',
    name: 'Lender-New',
    description: 'A lender can file for any company',
    realm: 'beta'
  }

  beforeEach(() => {
    fetch.mockImplementation(() =>
      Promise.resolve({
        status: 200,
        statusText: 'OK'
      })
    )
    getAccessToken.mockImplementation(() =>
      Promise.resolve(mockValues.accessToken)
    )
    process.env.FIDC_URL = mockValues.fidcUrl
    delete process.env.PHASE
    fs.readdirSync.mockReturnValue(['lender.json'])
    jest.mock(mockPhase0ConfigFile, () => mockPhase0Config, { virtual: true })
    jest.mock(mockPhase1ConfigFile1, () => mockPhase1Config, { virtual: true })
    jest.mock(mockPhase1ConfigFile2, () => mockPhase1Config, { virtual: true })
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

  it('should error if missing FRIC environment variable', async () => {
    expect.assertions(2)
    delete process.env.FIDC_URL
    await updateUserRoles(mockValues)
    expect(console.error).toHaveBeenCalledWith(
      'Missing FIDC_URL environment variable'
    )
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should error if getAccessToken functions fails', async () => {
    expect.assertions(2)
    const errorMessage = 'Invalid user'
    getAccessToken.mockImplementation(() =>
      Promise.reject(new Error(errorMessage))
    )
    await updateUserRoles(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should call API with phase 0 config by default', async () => {
    expect.assertions(2)
    const expectedUrl = `${mockValues.fidcUrl}/openidm/managed/${mockPhase0Config.realm}_role/${mockPhase0Config._id}`
    const expectedApiOptions = {
      method: 'put',
      body: JSON.stringify(mockPhase0Config),
      headers: {
        authorization: `Bearer ${mockValues.accessToken}`,
        'content-type': 'application/json'
      }
    }
    await updateUserRoles(mockValues)
    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedApiOptions)
  })

  it('should call API with phase config by environment variable', async () => {
    expect.assertions(2)
    process.env.PHASE = 1
    fs.readdirSync.mockReturnValue(['lender.json', 'presenter.json'])
    const expectedUrl = `${mockValues.fidcUrl}/openidm/managed/${mockPhase1Config.realm}_role/${mockPhase1Config._id}`
    const expectedApiOptions = {
      method: 'put',
      body: JSON.stringify(mockPhase1Config),
      headers: {
        authorization: `Bearer ${mockValues.accessToken}`,
        'content-type': 'application/json'
      }
    }
    await updateUserRoles(mockValues)
    expect(fetch.mock.calls.length).toEqual(2)
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedApiOptions)
  })

  it('should error if API request fails', async () => {
    expect.assertions(2)
    const errorMessage = 'Something went wrong'
    fetch.mockImplementation(() => Promise.reject(new Error(errorMessage)))
    await updateUserRoles(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should error if API response is not 200', async () => {
    expect.assertions(2)
    fetch.mockImplementation(() =>
      Promise.resolve({
        status: 401,
        statusText: 'Unauthorized'
      })
    )
    await updateUserRoles(mockValues)
    expect(console.error).toHaveBeenCalledWith(
      `${mockPhase0Config.name} 401: Unauthorized`
    )
    expect(process.exit).toHaveBeenCalledWith(1)
  })
})
