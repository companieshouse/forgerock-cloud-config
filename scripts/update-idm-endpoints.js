const fs = require('fs')
const path = require('path')
const getAccessToken = require('../helpers/get-access-token')
const fidcRequest = require('../helpers/fidc-request')

const convertScript = async (fileName) => {
  console.log(`converting ${fileName} ...`)
  let body = fs.readFileSync(fileName, 'utf8', (err, data) => {
    if (err) {
      return console.log(err)
    }

    body = {
      type: 'text/javascript',
      source: data
        .split('\n')
        .map((line) => {
          if (line.trim().startsWith('//')) {
            return ''
          }
          return line.trim()
        })
        .join(' ')
    }
  })
  return body
}

const updateScripts = async (argv) => {
  const { FIDC_URL } = process.env

  try {
    const accessToken = await getAccessToken(argv)

    // Read auth tree JSON files
    const dir = path.resolve(__dirname, '../config/idm-endpoints')

    const scriptFileContent = fs
      .readdirSync(dir)
      .filter((name) => path.extname(name) === '.json') // Filter out any non JSON files
      .map((filename) => require(path.join(dir, filename))) // Map JSON file content to an array

    // Update each script
    await Promise.all(
      scriptFileContent.map(async (scriptFile) => {
        await Promise.all(
          scriptFile.endpoints.map(async (endpoint) => {
            // const compileRequestUrl = `${FIDC_URL}/openidm/script?_action=compile`
            const requestUrl = `${FIDC_URL}/openidm/config/endpoint/${endpoint.endpointName}`
            const scriptConvertedBody = await convertScript(`${dir}/scripts-content/${endpoint.scriptFileName}`)
            const requestBody = {
              type: 'text/javascript',
              source: scriptConvertedBody
            }
            console.log(JSON.stringify(requestBody))
            // await fidcRequest(compileRequestUrl, requestBody, accessToken)
            await fidcRequest(requestUrl, requestBody, accessToken)
          })
        )
        console.log('IDM endpoint updated')
        return Promise.resolve()
      })
    )
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = updateScripts
