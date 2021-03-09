describe('update-internal-roles', () => {
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

  const updateUserRoles = require('../../scripts/update-internal-roles')

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    accessToken: 'forgerock-token'
  }

  const mockPhase0ConfigFile = path.resolve(
    __dirname,
    '../../config/phase-0/internal-roles/admin.json'
  )
  const mockPhase1ConfigFile1 = path.resolve(
    __dirname,
    '../../config/phase-1/internal-roles/admin.json'
  )
  const mockPhase1ConfigFile2 = path.resolve(
    __dirname,
    '../../config/phase-1/internal-roles/write-user.json'
  )

  const mockPhase0Config = {
    _id: 'abcd',
    name: 'Admin',
    description: 'Admin role for internal users',
    privileges: [
      {
        path: 'managed/Company',
        name: 'Companies',
        permissions: ['ALL']
      }
    ]
  }

  const mockPhase1Config = {
    _id: '1234',
    name: 'Write User',
    description: 'Write permissions for internal users',
    privileges: [
      {
        path: 'managed/Company',
        name: 'Companies',
        permissions: ['WRITE']
      }
    ]
  }

  beforeEach(() => {
    fidcRequest.mockImplementation(() => Promise.resolve())
    getAccessToken.mockImplementation(() =>
      Promise.resolve(mockValues.accessToken)
    )
    process.env.FIDC_URL = mockValues.fidcUrl
    delete process.env.PHASE
    fs.readdirSync.mockReturnValue(['admin.json'])
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
    const expectedUrl = `${mockValues.fidcUrl}/openidm/internal/role/${mockPhase0Config._id}`
    await updateUserRoles(mockValues)
    expect(fidcRequest.mock.calls.length).toEqual(1)
    expect(fidcRequest).toHaveBeenCalledWith(
      expectedUrl,
      mockPhase0Config,
      mockValues.accessToken
    )
  })

  it('should call API with phase config by environment variable', async () => {
    expect.assertions(2)
    process.env.PHASE = 1
    fs.readdirSync.mockReturnValue(['admin.json', 'write-user.json'])
    const expectedUrl = `${mockValues.fidcUrl}/openidm/internal/role/${mockPhase1Config._id}`
    await updateUserRoles(mockValues)
    expect(fidcRequest.mock.calls.length).toEqual(2)
    expect(fidcRequest).toHaveBeenCalledWith(
      expectedUrl,
      mockPhase1Config,
      mockValues.accessToken
    )
  })

  it('should error if API request fails', async () => {
    expect.assertions(2)
    const errorMessage = 'Something went wrong'
    fidcRequest.mockImplementation(() =>
      Promise.reject(new Error(errorMessage))
    )
    await updateUserRoles(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })
})
