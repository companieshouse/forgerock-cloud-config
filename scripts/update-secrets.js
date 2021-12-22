const getAccessToken = require('../helpers/get-access-token')
const fidcGet = require('../helpers/fidc-get')
const fidcRequest = require('../helpers/fidc-request')
const fidcPost = require('../helpers/fidc-post')
const path = require('path')
const fs = require('fs')

async function alreadyExists (requestUrl, accessToken) {
  let ret = false

  try {
    await fidcGet(requestUrl, accessToken)
    ret = true
  } catch (e) {
  }

  return ret
}

const updateSecrets = async (argv) => {
  const { FIDC_URL } = process.env

  try {
    const accessToken = await getAccessToken(argv)
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
                console.error(`No environment value with key : '${envName}' for ESV named : '${secretEntry._id}', quitting.`)
                process.exit(1)
              }

              secretEntry.valueBase64 = envValue
            }

            secrets.push(secretEntry)
          }
        })
      }
    }

    console.log('Processing secrets ...')

    for (const objSecret of secrets) {
      const secretName = objSecret._id
      delete objSecret._id

      const requestUrl = `${FIDC_URL}/environment/secrets/${secretName}`
      const secretExists = await alreadyExists(requestUrl, accessToken)
      let updateMode = 'created'

      if (!secretExists) {
        await fidcRequest(requestUrl, objSecret, accessToken, false)
      } else {
        updateMode = 'updated'
        const requestUrlVersions = requestUrl + '/versions?_action=create'
        await fidcPost(requestUrlVersions, objSecret, accessToken, false)
      }

      console.log(`Secret '${secretName}' ${updateMode}`)
    }

    console.log('Secrets processed.')
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = updateSecrets
