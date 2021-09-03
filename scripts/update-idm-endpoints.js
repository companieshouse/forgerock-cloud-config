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
                _id: task.taskName,
                recoverable: false,
                misfirePolicy: 'fireAndProceed',
                repeatCount: -1,
                enabled: true,
                type: 'simple',
                repeatInterval: task.repeatInterval,
                persisted: true,
                concurrentExecution: false,
                invokeService: 'taskscanner',
                invokeContext: {
                  waitForCompletion: false,
                  numberOfThreads: 5,
                  scan: {
                    _queryFilter: task.queryFilter,
                    object: 'managed/alpha_user',
                    taskState: {
                      started: '/frUnindexedString1',
                      completed: '/frUnindexedString2'
                    },
                    recovery: {
                      timeout: '10m'
                    }
                  },
                  task: {
                    script: {
                      type: 'text/javascript',
                      globals: {},
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
                  },
                  invokeLogLevel: 'info'
                }
              }
              // console.log(`IDM task code: ${JSON.stringify(body)}`)

              const requestUrl = `${FIDC_URL}/openidm/scheduler/job/${task.taskName}`
              await fidcRequest(requestUrl, body, accessToken)
              console.log(`IDM Task updated: ${task.taskName}`)
            })
          })
        )
        return Promise.resolve()
      })
    )

    await Promise.all(
      scriptFileContent.map(async (scriptFile) => {
        await Promise.all(
          scriptFile.scheduledScripts.map(async (schedule) => {
            fs.readFile(`${dir}/scripts-content/${schedule.scriptFileName}`, 'utf8', async (err, data) => {
              if (err) {
                return console.log(err)
              }
              const body = {
                _id: schedule.scheduleName,
                enabled: true,
                persisted: true,
                recoverable: false,
                misfirePolicy: 'fireAndProceed',
                schedule: schedule.cronExp,
                repeatInterval: 0,
                repeatCount: 0,
                type: 'cron',
                invokeService: 'script',
                invokeContext: {
                  script: {
                    type: 'text/javascript',
                    globals: {},
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
                },
                invokeLogLevel: 'info',
                startTime: null,
                endTime: null,
                concurrentExecution: false,
                previousRunDate: null,
                saveToConfig: false
              }

              // console.log(`IDM task code: ${JSON.stringify(body)}`)

              const requestUrl = `${FIDC_URL}/openidm/scheduler/job/${schedule.scheduleName}`
              await fidcRequest(requestUrl, body, accessToken)
              console.log(`IDM Scheduled script updated: ${schedule.scheduleName}`)
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
