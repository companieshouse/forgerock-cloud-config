const fs = require('fs')
const path = require('path')
const getAccessToken = require('../helpers/get-access-token')
const fidcRequest = require('../helpers/fidc-request')
const replaceSensitiveValues = require('../helpers/replace-sensitive-values')

const updateManagedUsers = async (argv) => {
  const { FIDC_URL, AUTH_TREE_PASSWORD, ADMIN_CLIENT_TEST_PASSWORD } = process.env

  try {
    const accessToken = await getAccessToken(argv)

    // Combine managed object JSON files
    const dir = path.resolve(__dirname, '../config/managed-users')

    const tsup = argv.treeServiceUserPassword || AUTH_TREE_PASSWORD

    await replaceSensitiveValues(
      dir,
      [
        /{AUTH_TREE_PASSWORD}/g,
        /{ADMIN_CLIENT_TEST_PASSWORD}/g
      ],
      [
        tsup,
        ADMIN_CLIENT_TEST_PASSWORD
      ]
    )

    const managedUsersFileContent = fs
      .readdirSync(dir)
      .filter((name) => path.extname(name) === '.json') // Filter out any non JSON files
      .map((filename) => require(path.join(dir, filename))) // Map JSON file content to an array

    await Promise.all(
      managedUsersFileContent.map(async (managedUserFile) => {
        const realm = managedUserFile.realm || 'alpha'
        delete managedUserFile.realm

        const requestUrl = `${FIDC_URL}/openidm/managed/${realm}_user/${managedUserFile._id}`
        await fidcRequest(requestUrl, managedUserFile, accessToken, false)
        console.log(`${realm} user, ${managedUserFile.userName} updated`)

        return Promise.resolve()
      })
    )
    console.log('Managed users updated')
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = updateManagedUsers
