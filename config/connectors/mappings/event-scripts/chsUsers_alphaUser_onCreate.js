// chsUsers_alphaUser On Create
var incomingRoles = source.roles

if (incomingRoles != null) {
  var rolesLength = incomingRoles.length

  var fidcRoles = []

  for (var i = 0; i < rolesLength; i++) {
    var role = incomingRoles[i]

    var existingRole = openidm.query('managed/alpha_role', { '_queryFilter': '/name eq "' + role + '"' }, ['*'])
    if (existingRole.result.length > 0) {
      existingRoleId = existingRole.result[0]._id

      var fidcRole = {
        _ref: 'managed/alpha_role/' + existingRoleId
      }

      fidcRoles.push(fidcRole)
    }
  }

  if (fidcRoles.length > 0) {
    target.roles = fidcRoles
  }
}

target.frIndexedString2 = source.password
target.frIndexedString3 = 'pending'
target.frIndexedString5 = 'chs'