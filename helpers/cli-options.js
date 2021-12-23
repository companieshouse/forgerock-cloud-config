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
    },
    authTreePassword: {
      alias: 't',
      demandOption: true,
      describe: 'Password for the Auth Tree Admin Client'
    },
    igOidcPassword: {
      alias: 'i',
      demandOption: true,
      describe: 'Password for the IG OIDC Client'
    },
    igAgentPassword: {
      alias: 'ia',
      demandOption: true,
      describe: 'Password for the IG Agent'
    },
    authTreeName: {
      alias: 'atn',
      demandOption: false,
      describe: 'Auth Tree Name'
    },
    managedUsername: {
      alias: 'mu',
      demandOption: false,
      describe: 'Managed Username'
    },
    treeServiceUserPassword: {
      alias: 'tsup',
      demandOption: false,
      describe: 'Password for the Tree Service User'
    },
    filenameFilter: {
      alias: 'ff',
      demandOption: false,
      describe: 'Filename Filter (combine multiples using comma, use ~ prefix on entry for wildcard match)'
    }
  }

  return requestedOptions.reduce(
    (acc, curr) => ({ ...acc, [curr]: options[curr] }),
    {}
  )
}

module.exports = cliOptions
