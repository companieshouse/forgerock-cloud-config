const fs = require('fs')
const path = require('path')
const getSessionToken = require('../helpers/get-session-token')
const fidcRequest = require('../helpers/fidc-request')
const fileFilter = require('../helpers/file-filter')

const updateScripts = async (argv) => {
  const { realm } = argv
  const { FIDC_URL, filenameFilter } = process.env

  try {
    const sessionToken = await getSessionToken(argv)

    // Read auth tree JSON files
    const dir = path.resolve(__dirname, '../config/am-scripts')
    const useFF = filenameFilter || argv.filenameFilter

    const scriptFileContent = fs
      .readdirSync(dir)
      .filter((name) => path.extname(name) === '.json') // Filter out any non JSON files
      .map((filename) => require(path.join(dir, filename))) // Map JSON file content to an array

    // Update each script
    await Promise.all(
      scriptFileContent.map(async (scriptFile) => {
        const baseUrl = `${FIDC_URL}/am/json/realms/root/realms/${realm}`
        await Promise.all(
          scriptFile.scripts.map(async (script) => {
            if (!fileFilter(script.filename, useFF)) {
              return
            }

            if (!script.payload.name || script.payload.name.trim() === '') {
              throw new Error(`ERROR script Id :  ${script.payload._id} must have a valid (non-blank) name!`)
            }

            // updates the script content with encoded file
            script.payload.script = fs.readFileSync(
              `${dir}/scripts-content/${script.filename}`,
              { encoding: 'base64' }
            )

            console.log(`updating script : ${script.payload.name} (${script.filename})`)
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
