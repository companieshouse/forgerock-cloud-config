const fs = require('fs')
const path = require('path')
const getServiceAccountToken = require('../helpers/get-service-account-token')
const fidcRequest = require('../helpers/fidc-request')

const updateUserRoles = async (argv) => {
  const { FIDC_URL } = process.env

  try {
    const accessToken = await getServiceAccountToken()

    // Combine managed object JSON files
    const dir = path.resolve(__dirname, '../config/user-roles')

    const userRolesFileContent = fs
      .readdirSync(dir)
      .filter((name) => path.extname(name) === '.json') // Filter out any non JSON files
      .map((filename) => require(path.join(dir, filename))) // Map JSON file content to an array

    await Promise.all(
      userRolesFileContent.map(async (userRoleFile) => {
        const requestUrl = `${FIDC_URL}/openidm/managed/${userRoleFile.realm}_role/${userRoleFile._id}`
        await fidcRequest(requestUrl, userRoleFile, accessToken)
        console.log(`${userRoleFile.name} updated`)
        return Promise.resolve()
      })
    )
    console.log('User roles updated')
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = updateUserRoles
