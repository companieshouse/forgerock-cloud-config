const fs = require('fs')
const path = require('path')
const getServiceAccountToken = require('../helpers/get-service-account-token')
const fidcRequest = require('../helpers/fidc-request')
const fidcGet = require('../helpers/fidc-get')
const fidcPost = require('../helpers/fidc-post')
const manageRestartFidcFileMarker = require('../helpers/restart-fidc-file-helper')

async function alreadyExists (variableName, valueBase64, requestUrl, scriptUrl, accessToken) {
  const ret = {
    exists: false,
    loaded: false,
    same: false
  }

  try {
    const response = await fidcGet(requestUrl, accessToken)

    ret.exists = true
    ret.loaded = response.loaded

    const currentValue = await fidcPost(scriptUrl, {
      type: 'text/javascript',
      source: 'identityServer.getProperty("' + variableName.replaceAll('-', '.') + '")'
    }, accessToken)

    if (currentValue) {
      const currentValueB64 = Buffer.from(currentValue).toString('base64')
      ret.same = (valueBase64 === currentValueB64)
    }
  } catch (e) {
  }

  return ret
}

const updateVariables = async () => {
  const { FIDC_URL } = process.env

  try {
    const accessToken = await getServiceAccountToken()
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
                console.error(`No environment value with key : '${envName}' for ESV named : '${varEntry._id}', exiting!`)
                process.exit(1)
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

    let restartRequired = false

    for (const objVariable of variables) {
      const variableName = objVariable._id
      delete objVariable._id

      const requestUrl = `${FIDC_URL}/environment/variables/${variableName}`
      const scriptUrl = `${FIDC_URL}/openidm/script?_action=eval`

      const variableResponse = await alreadyExists(variableName, objVariable.valueBase64, requestUrl, scriptUrl, accessToken)

      if (!restartRequired) {
        restartRequired = !variableResponse.loaded || !variableResponse.same
      }

      const variableExists = variableResponse.exists
      const variableSame = variableResponse.same

      let updateMode = 'skipped (same value loaded)'

      if (!variableExists || !variableSame) {
        updateMode = 'created/updated'
        await fidcRequest(requestUrl, objVariable, accessToken, false)
      }

      console.log(`Variable '${variableName}' ${updateMode}`)
    }

    console.log('Variables processed.')

    manageRestartFidcFileMarker(restartRequired)
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = updateVariables
