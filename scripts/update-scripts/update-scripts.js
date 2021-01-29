const fetch = require('node-fetch')
const fs = require('fs')
const path = require('path')
const getSessionToken = require('../../helpers/get-session-token')
//const updateNode = require('./update-node')

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
                    //updates the script content with encoded file
                    console.log(process.cwd()); 
                    script.payload.script = fs.readFileSync(`./config/phase-${PHASE}/am-scripts/scripts-content/${script.filename}`, {encoding: 'base64'});
                    return await updateScript(baseUrl, sessionToken, script.payload)
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

const updateScript = async (url, cookieHeader, script) => {
    const requestUrl = `${url}/scripts/${script._id}`
    console.log(requestUrl);
    const requestOptions = {
      method: 'put',
      body: JSON.stringify({
        _id: script._id,
        ...script
      }),
      headers: {
        'content-type': 'application/json',
        'x-requested-with': 'ForgeRock CREST.js',
        'Accept-API-Version': 'resource=1.1',
        cookie: cookieHeader
      }
    }
    const { status, statusText } = await fetch(requestUrl, requestOptions)
    if (status > 299) {
      throw new Error(`${node._id} ${status}: ${statusText}`)
    }
    return Promise.resolve()
}

module.exports = updateScripts
