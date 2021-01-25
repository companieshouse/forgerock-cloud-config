describe('update-managed-objects', () => {
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

  const updateManagedObject = require('./update-managed-objects')

  const mockValues = {
    fricUrl: 'https://fric-test.forgerock.com',
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

  const expectedUrl = `${mockValues.fricUrl}/openidm/config/managed`

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
    process.env.FRIC_URL = mockValues.fricUrl
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

  it('should error if missing FRIC environment variable', async () => {
    delete process.env.FRIC_URL
    await updateManagedObject(mockValues)
    expect(console.error).toHaveBeenCalledWith(
      'Missing FRIC_URL environment variable'
    )
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should error if getAccessToken functions fails', async () => {
    const errorMessage = 'Invalid user'
    getAccessToken.mockImplementation(() =>
      Promise.reject(new Error(errorMessage))
    )
    await updateManagedObject(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should call API with phase 0 config by default', async () => {
    const expectedApiOptions = {
      method: 'put',
      headers: {
        Authorization: `Bearer ${mockValues.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        objects: [mockPhase0Config]
      })
    }
    await updateManagedObject(mockValues)
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedApiOptions)
  })

  it('should call API with phase config by environment variable', async () => {
    process.env.PHASE = 1
    const expectedApiOptions = {
      method: 'put',
      headers: {
        Authorization: `Bearer ${mockValues.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        objects: [mockPhase1Config]
      })
    }
    await updateManagedObject(mockValues)
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedApiOptions)
  })

  it('should error if API request fails', async () => {
    const errorMessage = 'testing request failed'
    fetch.mockImplementation(() => Promise.reject(new Error(errorMessage)))
    await updateManagedObject(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should error if API response is not 200', async () => {
    fetch.mockImplementation(() =>
      Promise.resolve({
        status: 401,
        statusText: 'Unauthorized'
      })
    )
    await updateManagedObject(mockValues)
    expect(console.error).toHaveBeenCalledWith('401: Unauthorized')
    expect(process.exit).toHaveBeenCalledWith(1)
  })
})
