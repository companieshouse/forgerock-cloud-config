describe('file-filter', () => {
  const fileFilter = require('../../helpers/file-filter')

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('matches single file completely', async () => {
    expect.assertions(1)

    const useIt = fileFilter('my-file', 'my-file')
    expect(useIt).toEqual(true)
  })

  it('matches multiple files', async () => {
    expect.assertions(1)

    const useIt = fileFilter('my-extra-file', 'my-file, my-different-file, ~extra')
    expect(useIt).toEqual(true)
  })

  it('matches file using fuzz', async () => {
    expect.assertions(1)

    const useIt = fileFilter('this-is-my-file', '~my-file')
    expect(useIt).toEqual(true)
  })

  it('does not match file using fuzz', async () => {
    expect.assertions(1)

    const useIt = fileFilter('this-is-my-file', '~my-other-file')
    expect(useIt).toEqual(false)
  })
})
