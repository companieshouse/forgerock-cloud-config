const updateVariables = require('./update-variables')
const updateSecrets = require('./update-secrets')
const restartFidc = require('./restart-fidc')
const fs = require('fs')

const updateEsvAndRestart = async () => {
  const restartRequiredFilename = 'FIDC_RESTART_REQUIRED.txt'

  if (fs.existsSync(restartRequiredFilename)) {
    fs.unlinkSync(restartRequiredFilename)
  }

  await updateVariables()
  await updateSecrets()

  if (fs.existsSync(restartRequiredFilename)) {
    console.log('Restart required ...')

    await restartFidc()

    fs.unlinkSync(restartRequiredFilename)
  }
}

module.exports = updateEsvAndRestart
