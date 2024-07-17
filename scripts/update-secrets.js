const getServiceAccountToken = require('../helpers/get-service-account-token')
const fidcGet = require('../helpers/fidc-get')
const fidcRequest = require('../helpers/fidc-request')
const fidcPost = require('../helpers/fidc-post')
const manageRestartFidcFileMarker = require('../helpers/restart-fidc-file-helper')
const path = require('path')
const fs = require('fs')

async function alreadyExists (secretName, valueBase64, requestUrl, scriptUrl, accessToken) {
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
      source: 'identityServer.getProperty("' + secretName.replaceAll('-', '.') + '")'
    }, accessToken)

    if (currentValue) {
      const currentValueB64 = Buffer.from(currentValue).toString('base64')
      ret.same = (valueBase64 === currentValueB64)
    }
  } catch (e) {
  }

  return ret
}

const updateSecrets = async () => {
  const { FIDC_URL } = process.env

  try {
    const accessToken = await getServiceAccountToken()
    const secrets = []
    const secretsPath = path.resolve(__dirname, '../config/variables-secrets/secrets.json')

    if (fs.existsSync(secretsPath)) {
      const secretsPathJson = fs.readFileSync(secretsPath, { encoding: 'utf8' })
      if (secretsPathJson) {
        const secretsPathObject = JSON.parse(secretsPathJson)
        secretsPathObject.forEach(function (secretEntry) {
          if (secretEntry._id && secretEntry.valueBase64) {
            if (secretEntry.valueBase64.startsWith('%') && secretEntry.valueBase64.endsWith('%')) {
              const envName = secretEntry.valueBase64.replaceAll('%', ' ').trim()
              const envValue = process.env[envName]

              if (!envValue) {
                console.error(`No environment value with key : '${envName}' for ESV named : '${secretEntry._id}', exiting!`)
                process.exit(1)
              }

              secretEntry.valueBase64 = envValue
            }

            if (secretEntry.valueBase64) {
              secrets.push(secretEntry)
            }
          }
        })
      }
    }

    console.log('Processing secrets ...')

    let restartRequired = false

    for (const objSecret of secrets) {
      const secretName = objSecret._id
      delete objSecret._id

      const requestUrl = `${FIDC_URL}/environment/secrets/${secretName}`
      const scriptUrl = `${FIDC_URL}/openidm/script?_action=eval`

      const secretResponse = await alreadyExists(secretName, objSecret.valueBase64, requestUrl, scriptUrl, accessToken)

      if (!restartRequired) {
        restartRequired = !secretResponse.loaded || !secretResponse.same
      }

      const secretExists = secretResponse.exists
      const secretSame = secretResponse.same

      let updateMode = 'skipped (same value loaded)'

      if (!secretExists || !secretSame) {
        if (!secretExists) {
          updateMode = 'created'
          await fidcRequest(requestUrl, objSecret, accessToken, false)
        } else {
          updateMode = 'updated'
          const requestUrlVersions = requestUrl + '/versions?_action=create'
          await fidcPost(requestUrlVersions, objSecret, accessToken, false)
        }
      }

      console.log(`Secret '${secretName}' ${updateMode}`)
    }

    console.log('Secrets processed.')

    manageRestartFidcFileMarker(restartRequired)
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = updateSecrets
