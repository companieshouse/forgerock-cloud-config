const updateVariables = require('./update-variables')
const updateSecrets = require('./update-secrets')
const restartFidc = require('./restart-fidc')
const fs = require('fs')

const updateEsvAndRestart = async (argv) => {
  const restartRequiredFilename = 'FIDC_RESTART_REQUIRED.txt'

  if (fs.existsSync(restartRequiredFilename)) {
    fs.unlinkSync(restartRequiredFilename)
  }

  await updateVariables(argv)
  await updateSecrets(argv)

  if (fs.existsSync(restartRequiredFilename)) {
    console.log('Restart required ...')

    await restartFidc(argv)

    fs.unlinkSync(restartRequiredFilename)
  }
}

module.exports = updateEsvAndRestart
