describe('replace-sensitive-values', () => {
  jest.mock('fs')
  const fs = require('fs')
  jest.mock('fs-extra')
  const fse = require('fs-extra')
  jest.mock('replace-in-file')
  const replace = require('replace-in-file')

  const replaceSensitiveValues = require('../../helpers/replace-sensitive-values')

  const mockValues = {
    dir: 'config/services',
    valuesToReplace: ['{REPLACEMENT_SECRET}'],
    replacements: ['super_secret_value']
  }

  const expectedTemplateFile = `${mockValues.dir}/oauth2-provider.json.tpl`
  const expectedConfigFile = `${mockValues.dir}/oauth2-provider.json`
  const expectedReplaceOptions = {
    files: [expectedConfigFile],
    from: mockValues.valuesToReplace,
    to: mockValues.replacements
  }

  beforeEach(() => {
    fs.readdirSync.mockReturnValue(['oauth2-provider.json.tpl'])
    fse.copy.mockImplementation(() => Promise.resolve())
    replace.mockImplementation(() => Promise.resolve())
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('call copy and replace with the correct options', async () => {
    expect.assertions(2)

    await replaceSensitiveValues(
      mockValues.dir,
      mockValues.valuesToReplace,
      mockValues.replacements
    )
    expect(fse.copy).toHaveBeenCalledWith(
      expectedTemplateFile,
      expectedConfigFile
    )
    expect(replace).toHaveBeenCalledWith(expectedReplaceOptions)
  })

  it('return an error if the copy fails', async () => {
    expect.assertions(3)
    const error = new Error('No File Found')
    fse.copy.mockImplementation(() => Promise.reject(error))

    await expect(
      replaceSensitiveValues(
        mockValues.dir,
        mockValues.valuesToReplace,
        mockValues.replacements
      )
    ).rejects.toEqual(error)
    expect(fse.copy).toHaveBeenCalledWith(
      expectedTemplateFile,
      expectedConfigFile
    )
    expect(replace).not.toHaveBeenCalled()
  })

  it('return an error if the replace fails', async () => {
    expect.assertions(3)
    const error = new Error('Replacement invalid')
    replace.mockImplementation(() => Promise.reject(error))

    await expect(
      replaceSensitiveValues(
        mockValues.dir,
        mockValues.valuesToReplace,
        mockValues.replacements
      )
    ).rejects.toEqual(error)
    expect(fse.copy).toHaveBeenCalledWith(
      expectedTemplateFile,
      expectedConfigFile
    )
    expect(replace).toHaveBeenCalledWith(expectedReplaceOptions)
  })
})
