describe('update-ui-config', () => {
  const path = require('path')
  jest.mock('../../helpers/get-access-token')
  const getAccessToken = require('../../helpers/get-access-token')
  jest.mock('../../helpers/fidc-request')
  const fidcRequest = require('../../helpers/fidc-request')
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(process, 'exit').mockImplementation(() => {})

  const updateUiConfig = require('../../scripts/update-ui-config')

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    accessToken: 'forgerock-token'
  }

  const mockConfigFile = path.resolve(
    __dirname,
    '../../config/ui/ui-config.json'
  )

  const mockConfig = {
    _id: 'ui/configuration',
    configuration: {
      defaultNotificationType: 'info',
      forgotUsername: false,
      lang: 'en',
      notificationTypes: {
        error: {
          iconPath: 'images/notifications/error.png',
          name: 'common.notification.types.error'
        },
        info: {
          iconPath: 'images/notifications/info.png',
          name: 'common.notification.types.info'
        },
        warning: {
          iconPath: 'images/notifications/warning.png',
          name: 'common.notification.types.warning'
        }
      },
      passwordReset: true,
      passwordResetLink: '',
      platformSettings: {
        adminOauthClient: 'idmAdminClient',
        adminOauthClientScopes: 'fr:idm:*',
        amUrl: '/am',
        loginUrl: '',
        managedObjectsSettings: {
          alpha_organization: {
            disableRelationshipSortAndSearch: true,
            minimumUIFilterLength: 5
          },
          alpha_user: {
            disableRelationshipSortAndSearch: true,
            minimumUIFilterLength: 3
          }
        }
      },
      roles: {
        'internal/role/openidm-admin': 'ui-admin',
        'internal/role/openidm-authorized': 'ui-user'
      },
      selfRegistration: true
    }
  }

  const expectedUrl = `${mockValues.fidcUrl}/openidm/config/ui/configuration`

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
    await updateUiConfig(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should call API using config file', async () => {
    expect.assertions(2)
    await updateUiConfig(mockValues)
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
    await updateUiConfig(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })
})
