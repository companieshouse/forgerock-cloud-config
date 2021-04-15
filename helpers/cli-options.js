const cliOptions = (requestedOptions) => {
  const options = {
    username: {
      alias: 'u',
      demandOption: true,
      describe: 'Tenant Admin Email'
    },
    password: {
      alias: 'p',
      demandOption: true,
      describe: 'Tenant Admin Password'
    },
    realm: {
      alias: 'r',
      demandOption: false,
      describe: 'ForgeRock Realm',
      default: 'alpha'
    },
    idmUsername: {
      alias: 'iu',
      demandOption: true,
      describe: 'IDM Admin Username'
    },
    idmPassword: {
      alias: 'ip',
      demandOption: true,
      describe: 'IDM Admin Password'
    },
    adminClientId: {
      alias: 'a',
      demandOption: true,
      describe: 'IDM Admin Client ID'
    },
    adminClientSecret: {
      alias: 's',
      demandOption: true,
      describe: 'IDM Admin Client Secret'
    },
    versionNumber: {
      alias: 'v',
      demandOption: true,
      describe: 'FIDC Config Version Number'
    }
  }

  return requestedOptions.reduce(
    (acc, curr) => ({ ...acc, [curr]: options[curr] }),
    {}
  )
}

module.exports = cliOptions
