describe('update-terms-and-conditions', () => {
  const path = require('path')
  jest.mock('../../helpers/get-access-token')
  const getAccessToken = require('../../helpers/get-access-token')
  jest.mock('../../helpers/fidc-request')
  const fidcRequest = require('../../helpers/fidc-request')
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(process, 'exit').mockImplementation(() => {})

  const updateTermsAndConditions = require('../../scripts/update-terms-and-conditions/update-terms-and-conditions')

  const mockValues = {
    fidcUrl: 'https://fidc-test.forgerock.com',
    accessToken: 'forgerock-token'
  }

  const mockPhase0ConfigFile = path.resolve(
    __dirname,
    '../../config/phase-0/consent/terms-and-conditions.json'
  )
  const mockPhase1ConfigFile = path.resolve(
    __dirname,
    '../../config/phase-1/consent/terms-and-conditions.json'
  )

  const mockPhase0Config = {
    versions: [
      {
        version: '0.0',
        termsTranslations: {
          en: 'Initial T&Cs'
        },
        createDate: '2019-10-28T04:20:11.320Z'
      }
    ],
    active: '0.0',
    uiConfig: {
      displayName: "We've updated our terms",
      purpose: 'You must accept the updated terms in order to proceed.',
      buttonText: 'Accept'
    }
  }

  const mockPhase1Config = {
    versions: [
      {
        version: '0.0',
        termsTranslations: {
          en: 'Initial T&Cs'
        },
        createDate: '2019-10-28T04:20:11.320Z'
      },
      {
        version: '1.0',
        termsTranslations: {
          en: 'Updated T&Cs'
        },
        createDate: '2019-10-28T04:20:11.320Z'
      }
    ],
    active: '1.0',
    uiConfig: {
      displayName: "We've updated our terms",
      purpose: 'You must accept the updated terms in order to proceed.',
      buttonText: 'Accept'
    }
  }

  const expectedUrl = `${mockValues.fidcUrl}/openidm/config/selfservice.terms`

  beforeEach(() => {
    fidcRequest.mockImplementation(() => Promise.resolve())
    getAccessToken.mockImplementation(() =>
      Promise.resolve(mockValues.accessToken)
    )
    process.env.FIDC_URL = mockValues.fidcUrl
    delete process.env.PHASE
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
    expect.assertions(2)
    delete process.env.FIDC_URL
    await updateTermsAndConditions(mockValues)
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
    await updateTermsAndConditions(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should call API with phase 0 config by default', async () => {
    expect.assertions(2)
    await updateTermsAndConditions(mockValues)
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
    await updateTermsAndConditions(mockValues)
    expect(fidcRequest.mock.calls.length).toEqual(1)
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
    await updateTermsAndConditions(mockValues)
    expect(console.error).toHaveBeenCalledWith(errorMessage)
    expect(process.exit).toHaveBeenCalledWith(1)
  })
})
