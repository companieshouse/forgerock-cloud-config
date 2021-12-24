const path = require('path')
const fs = require('fs')

function rationalise (key, value) {
  if (value) {
    if (value.startsWith('%') && value.endsWith('%')) {
      const envName = value.replaceAll('%', ' ').trim()
      const envValue = process.env[envName]

      if (!envValue) {
        console.error(`No environment value with key : '${envName}' for ESV named : '${key}', skipping!`)
        return ''
      }

      return envValue
    }

    return value
  }

  return ''
}

const getEsvConcourse = async (argv) => {
  const { regionName, decodeValue } = argv

  try {
    const secrets = []
    const variables = []

    console.log('\n----------------8<------------------------ CONCOURSE PARAMS -----------------------8<-----------------\n')
    console.log('params:')

    console.log('  # ESV - SECRETS')

    const secretsPath = path.resolve(__dirname, '../config/variables-secrets/secrets.json')

    if (fs.existsSync(secretsPath)) {
      const secretsPathJson = fs.readFileSync(secretsPath, { encoding: 'utf8' })
      if (secretsPathJson) {
        const secretsPathObject = JSON.parse(secretsPathJson)
        secretsPathObject.forEach(function (secretEntry) {
          if (secretEntry._id) {
            const envName = secretEntry._id.toUpperCase().replaceAll('-', '_')
            secrets.push({
              key: secretEntry._id,
              value: secretEntry.valueBase64
            })

            console.log('  ' + envName + ': ((' + regionName + '-' + secretEntry._id + '))')
          }
        })
      }
    }

    console.log('  # ESV - VARIABLES')

    const variablesPath = path.resolve(__dirname, '../config/variables-secrets/variables.json')

    if (fs.existsSync(variablesPath)) {
      const variablesPathJson = fs.readFileSync(variablesPath, { encoding: 'utf8' })
      if (variablesPathJson) {
        const variablesPathObject = JSON.parse(variablesPathJson)
        variablesPathObject.forEach(function (variableEntry) {
          if (variableEntry._id) {
            const envName = variableEntry._id.toUpperCase().replaceAll('-', '_')
            variables.push({
              key: variableEntry._id,
              value: variableEntry.valueBase64
            })

            console.log('  ' + envName + ': ((' + regionName + '-' + variableEntry._id + '))')
          }
        })
      }
    }

    console.log('\n----------------8<----------------------- AWS SSM PROPERTIES ----------------------8<-----------------\n')

    console.log('# ESV - SECRETS\n')

    for (const secret of secrets) {
      const rationalisedValue = rationalise(secret.key, secret.value)
      console.log('((' + regionName + '-' + secret.key + ')) = ' + rationalisedValue)
    }

    console.log('\n# ESV - VARIABLES\n')

    for (const variable of variables) {
      const rationalisedValue = rationalise(variable.key, variable.value)
      console.log('((' + regionName + '-' + variable.key + ')) = ' + rationalisedValue)
    }

    if (decodeValue === 'true') {
      console.log('\n----------------8<----------------------------- DECODED ---------------------------8<-----------------\n')

      console.log('# ESV - SECRETS (DECODED)\n')

      for (const secret of secrets) {
        const rationalisedValue = rationalise(secret.key, secret.value)
        console.log('((' + regionName + '-' + secret.key + ')) = ' + Buffer.from(rationalisedValue, 'base64').toString('utf-8'))
      }

      console.log('\n# ESV - VARIABLES (DECODED)\n')

      for (const variable of variables) {
        const rationalisedValue = rationalise(variable.key, variable.value)
        console.log('((' + regionName + '-' + variable.key + ')) = ' + Buffer.from(rationalisedValue, 'base64').toString('utf-8'))
      }
    }
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = getEsvConcourse
