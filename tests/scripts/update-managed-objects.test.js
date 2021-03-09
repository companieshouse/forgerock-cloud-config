describe('update-managed-objects', () => {
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

  const updateManagedObject = require('../../scripts/update-managed-objects')

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    accessToken: 'forgerock-token'
  }

  const mockPhase0ConfigFile = path.resolve(
    __dirname,
    '../../config/phase-0/managed-objects/user.json'
  )
  const mockPhase1ConfigFile = path.resolve(
    __dirname,
    '../../config/phase-1/managed-objects/user.json'
  )

  const mockPhase0Config = {
    iconClass: 'fa fa-database',
    name: 'user',
    schema: {
      order: ['userName', 'password'],
      properties: {
        password: {
          description: 'Password',
          type: 'string'
        },
        userName: {
          description: 'Username',
          type: 'string'
        }
      },
      required: ['userName', 'password'],
      title: 'User',
      type: 'object'
    },
    type: 'Managed Object'
  }

  const mockPhase1Config = {
    iconClass: 'fa fa-database',
    name: 'user',
    schema: {
      order: ['userName', 'password'],
      properties: {
        password: {
          description: 'Password',
          type: 'string'
        },
        userName: {
          description: 'Username',
          type: 'string'
        },
        company: {
          description: 'Company',
          type: 'relationship'
        }
      },
      required: ['userName', 'password', 'company'],
      title: 'User',
      type: 'object'
    },
    type: 'Managed Object'
  }

  const expectedUrl = `${mockValues.fidcUrl}/openidm/config/managed`

  beforeEach(() => {
    fidcRequest.mockImplementation(() => Promise.resolve())
    getAccessToken.mockImplementation(() =>
      Promise.resolve(mockValues.accessToken)
    )
    process.env.FIDC_URL = mockValues.fidcUrl
    delete process.env.PHASE
    fs.readdirSync.mockReturnValue(['user.json'])
    jest.mock(mockPhase0ConfigFile, () => mockPhase0Config, { virtual: true })
    jest.mock(mockPhase1ConfigFile, () => mockPhase1Config, { virtual: true })
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
    await updateManagedObject(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should call API with phase 0 config by default', async () => {
    expect.assertions(2)
    const expectedBody = {
      objects: [mockPhase0Config]
    }
    await updateManagedObject(mockValues)
    expect(fidcRequest.mock.calls.length).toEqual(1)
    expect(fidcRequest).toHaveBeenCalledWith(
      expectedUrl,
      expectedBody,
      mockValues.accessToken
    )
  })

  it('should call API with phase config by environment variable', async () => {
    expect.assertions(2)
    process.env.PHASE = 1
    const expectedBody = {
      objects: [mockPhase1Config]
    }
    await updateManagedObject(mockValues)
    expect(fidcRequest.mock.calls.length).toEqual(1)
    expect(fidcRequest).toHaveBeenCalledWith(
      expectedUrl,
      expectedBody,
      mockValues.accessToken
    )
  })

  it('should error if API request fails', async () => {
    const errorMessage = 'testing request failed'
    fidcRequest.mockImplementation(() =>
      Promise.reject(new Error(errorMessage))
    )
    await updateManagedObject(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })
})
