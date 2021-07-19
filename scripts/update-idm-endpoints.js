const fs = require('fs')
const path = require('path')
const getAccessToken = require('../helpers/get-access-token')
const fidcRequest = require('../helpers/fidc-request')

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
            fs.readFile(`${dir}/scripts-content/${endpoint.scriptFileName}`, 'utf8', async (err, data) => {
              if (err) {
                return console.log(err)
              }
              const body = {
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
              // console.log(`IDM endpoint code: ${JSON.stringify(body)}`)
              const requestUrl = `${FIDC_URL}/openidm/config/endpoint/${endpoint.endpointName}`
              await fidcRequest(requestUrl, body, accessToken)
              console.log(`IDM endpoint updated: ${endpoint.endpointName}`)
            })
          })
        )
        return Promise.resolve()
      })
    )

    // Update each task
    await Promise.all(
      scriptFileContent.map(async (scriptFile) => {
        await Promise.all(
          scriptFile.tasks.map(async (task) => {
            fs.readFile(`${dir}/scripts-content/${task.scriptFileName}`, 'utf8', async (err, data) => {
              if (err) {
                return console.log(err)
              }
              const body = {
                enabled: false,
                type: 'simple',
                repeatInterval: 3600000,
                persisted: true,
                concurrentExecution: false,
                invokeService: 'taskscanner',
                invokeContext: {
                  waitForCompletion: false,
                  numberOfThreads: 5,
                  scan: {
                    _queryFilter: `((/frIndexedDate1 lt "\${Time.now - 7d}"))`, // eslint-disable-line
                    object: 'managed/user',
                    taskState: {
                      started: '/frUnindexedString1',
                      completed: '/frUnindexedString2'
                    },
                    recovery: {
                      timeout: '10m'
                    }
                  },
                  task: {
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
                }
              }
              console.log(`IDM task code: ${JSON.stringify(body)}`)

              const requestUrl = `${FIDC_URL}/openidm/scheduler/job/${task.scriptFileName}Task`
              await fidcRequest(requestUrl, body, accessToken)
              console.log(`IDM Task updated: ${task.scriptFileName}`)
            })
          })
        )
        return Promise.resolve()
      })
    )
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = updateScripts
