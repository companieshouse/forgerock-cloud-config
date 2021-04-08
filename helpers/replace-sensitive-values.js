const fs = require('fs')
const path = require('path')
const fse = require('fs-extra')
const replace = require('replace-in-file')

const replaceSensitiveValues = async (dir, valuesToReplace, replacements) => {
  try {
    const templateFiles = fs
      .readdirSync(dir)
      .filter((name) => path.extname(name) === '.tpl') // Filter out any non TPL files
      .map((filename) => `${dir}/${filename}`)

    const configFiles = templateFiles.map((filename) =>
      filename.replace('.tpl', '')
    )

    // Copy template files to config files
    await Promise.all(
      templateFiles.map((templateFile, index) => {
        return fse.copy(templateFile, configFiles[index])
      })
    )

    // Replace sensitive values in config files
    const replaceOptions = {
      files: configFiles,
      from: valuesToReplace,
      to: replacements
    }

    return await replace(replaceOptions)
  } catch (error) {
    return Promise.reject(error)
  }
}

module.exports = replaceSensitiveValues
