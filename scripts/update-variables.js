const fs = require('fs')
const path = require('path')
const getAccessToken = require('../helpers/get-access-token')
const fidcRequest = require('../helpers/fidc-request')

const updateVariables = async (argv) => {
  const { FIDC_URL } = process.env

  try {
    const accessToken = await getAccessToken(argv)
    const variables = []
    const varsPath = path.resolve(__dirname, '../config/variables-secrets/variables.json')

    if (fs.existsSync(varsPath)) {
      const varsPathJson = fs.readFileSync(varsPath, { encoding: 'utf8' })
      if (varsPathJson) {
        const varsPathObject = JSON.parse(varsPathJson)

        varsPathObject.forEach(function (varEntry) {
          if (varEntry._id && varEntry.valueBase64) {
            if (varEntry.valueBase64.startsWith('%') && varEntry.valueBase64.endsWith('%')) {
              const envName = varEntry.valueBase64.replaceAll('%', ' ').trim()
              const envValue = process.env[envName]

              if (!envValue) {
                console.error(`No environment value with key : '${envName}' for ESV named : '${varEntry._id}', skipping!`)
                return
              }

              varEntry.valueBase64 = envValue
            }

            if (varEntry.valueBase64) {
              variables.push(varEntry)
            }
          }
        })
      }
    }

    console.log('Processing variables ...')

    for (const objVariable of variables) {
      const variableName = objVariable._id
      delete objVariable._id

      const requestUrl = `${FIDC_URL}/environment/variables/${variableName}`
      await fidcRequest(requestUrl, objVariable, accessToken, false)

      console.log(`Variable '${variableName}' applied`)
    }

    console.log('Variables processed.')
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = updateVariables
