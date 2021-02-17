const fs = require('fs')
const path = require('path')
const getSessionToken = require('../../helpers/get-session-token')
const fidcRequest = require('../../helpers/fidc-request')

const updateScripts = async (argv) => {
  const { realm } = argv

  // Check environment variables
  const { FIDC_URL, PHASE = '0' } = process.env

  if (!FIDC_URL) {
    console.error('Missing FIDC_URL environment variable')
    return process.exit(1)
  }

  try {
    const sessionToken = await getSessionToken(argv)
    console.log(`Using phase ${PHASE} config`)

    // Read auth tree JSON files
    const dir = path.resolve(
      __dirname,
      `../../config/phase-${PHASE}/am-scripts`
    )

    const scriptFileContent = fs
      .readdirSync(dir)
      .filter((name) => path.extname(name) === '.json') // Filter out any non JSON files
      .map((filename) => require(path.join(dir, filename))) // Map JSON file content to an array

    // Update each script
    await Promise.all(
      scriptFileContent.map(async (scriptFile) => {
        const baseUrl = `${FIDC_URL}/am/json${realm}`
        await Promise.all(
          scriptFile.scripts.map(async (script) => {
            if (!script.payload._id) {
              return Promise.reject(new Error('Missing _id in script config'))
            }
            // updates the script content with encoded file
            script.payload.script = fs.readFileSync(
              `${dir}/scripts-content/${script.filename}`,
              { encoding: 'base64' }
            )
            const requestUrl = `${baseUrl}/scripts/${script.payload._id}`
            return await fidcRequest(
              requestUrl,
              script.payload,
              sessionToken,
              true
            )
          })
        )
        console.log('scripts updated')
        return Promise.resolve()
      })
    )
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = updateScripts
