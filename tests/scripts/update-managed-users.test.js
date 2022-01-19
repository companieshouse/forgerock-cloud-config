describe('update-managed-users', () => {
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

  const updateManagedUsers = require('../../scripts/update-managed-users')

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    accessToken: 'forgerock-token'
  }

  const mockConfigFile = path.resolve(
    __dirname,
    '../../config/managed-users/tree-service-user.json'
  )

  const mockConfig = {
    _id: '99999999-6c71-45a9-9afb-cbde39b53ead',

    userName: 'test-tree-service-user@companieshouse.gov.uk',
    password: 'LetMeIn1234!',
    authzRoles: [
      {
        _ref: 'internal/role/openidm-admin'
      }
    ],

    accountStatus: 'active',
    effectiveRoles: [],
    effectiveAssignments: [],
    postalCode: null,
    stateProvince: null,
    postalAddress: null,
    displayName: null,
    description: null,
    country: null,
    city: null,
    givenName: null,
    profileImage: null,
    sn: 'test-tree-service-user@companieshouse.gov.uk',
    telephoneNumber: null,
    mail: 'test-tree-service-user@companieshouse.gov.uk',
    isMemberOf: null,
    frIndexedString1: '11111111111111111111111111111112',
    frIndexedString3: 'migrated',
    frIndexedString4: null,
    frIndexedString5: 'webfiling',
    frUnindexedString1: null,
    frUnindexedString2: null,
    frUnindexedString3: null,
    frUnindexedString4: null,
    frUnindexedString5: null,
    frIndexedMultivalued1: [],
    frIndexedMultivalued2: [],
    frIndexedMultivalued3: [],
    frIndexedMultivalued4: [],
    frIndexedMultivalued5: [],
    frUnindexedMultivalued1: [],
    frUnindexedMultivalued2: [],
    frUnindexedMultivalued3: [],
    frUnindexedMultivalued4: [],
    frUnindexedMultivalued5: [],
    frIndexedDate1: null,
    frIndexedDate2: null,
    frIndexedDate3: null,
    frIndexedDate4: null,
    frIndexedDate5: null,
    frUnindexedDate1: null,
    frUnindexedDate2: null,
    frUnindexedDate3: null,
    frUnindexedDate4: null,
    frUnindexedDate5: null,
    frIndexedInteger1: null,
    frIndexedInteger2: null,
    frIndexedInteger3: null,
    frIndexedInteger4: null,
    frIndexedInteger5: null,
    frUnindexedInteger1: null,
    frUnindexedInteger2: null,
    frUnindexedInteger3: null,
    frUnindexedInteger4: null,
    frUnindexedInteger5: null,
    consentedMappings: [],
    kbaInfo: [],
    preferences: null,
    aliasList: [],
    memberOfOrgIDs: []
  }

  beforeEach(() => {
    fidcRequest.mockImplementation(() => Promise.resolve())
    getAccessToken.mockImplementation(() =>
      Promise.resolve(mockValues.accessToken)
    )
    process.env.FIDC_URL = mockValues.fidcUrl
    fs.readdirSync.mockReturnValue(['tree-service-user.json'])
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
    await updateManagedUsers(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should call API using config file', async () => {
    expect.assertions(2)
    const expectedUrl = `${mockValues.fidcUrl}/openidm/managed/alpha_user/${mockConfig._id}`
    await updateManagedUsers(mockValues)
    expect(fidcRequest.mock.calls.length).toEqual(1)
    expect(fidcRequest).toHaveBeenCalledWith(
      expectedUrl,
      mockConfig,
      mockValues.accessToken,
      false
    )
  })

  it('should error if API request fails', async () => {
    expect.assertions(2)
    const errorMessage = 'Something went wrong'
    fidcRequest.mockImplementation(() =>
      Promise.reject(new Error(errorMessage))
    )
    await updateManagedUsers(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })
})
