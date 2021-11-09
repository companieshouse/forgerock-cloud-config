// Alpha_User On Update
require('onUpdateUser').preserveLastSync(object, oldObject, request)
newObject.mail = newObject.userName
newObject.sn = newObject.userName

try {
  let companies = newObject.memberOfOrg
  if (companies) {
    companies.forEach((company, index) => {
      if (!company._refProperties.membershipStatus) {
        logger.error('TASK ONUPDATE - COMPANY RELATIONSHIP DOES NOT HAVE STATUS! Upgrading to CONFIRMED')
        let res = openidm.read(newObject.memberOfOrg[index]._ref, null, ['*'])
        newObject.memberOfOrg[index]._refProperties.membershipStatus = 'confirmed'
        newObject.memberOfOrg[index]._refProperties.companyLabel = res.name + ' - ' + res.number
        newObject.memberOfOrg[index]._refProperties.adminAdded = 'true'
      }
    })
  } else {
    logger.info('TASK ONUPDATE memberOfOrg not found - skipping invite timestamp array update.')
  }

  companies = newObject.memberOfOrg
  if (companies) {
    let newTimestamps = []
    logger.debug('TASK ONUPDATE found companies for this user: ' + companies.length)
    companies.forEach(company => {
      if (company._refProperties.membershipStatus === 'pending') {
        newTimestamps.push(company._refProperties.inviteTimestamp)
      }
    })
    logger.info('TASK ONUPDATE found pending invites for this user: ' + newTimestamps.length)
    newObject.frIndexedMultivalued1 = newTimestamps
  } else {
    logger.info('TASK ONUPDATE memberOfOrg not found - skipping invite timestamp array update.')
  }

  companies = newObject.memberOfOrg
  if (companies) {
    let confirmedCompanyLabels = []
    let pendingCompanyLabels = []
    companies.forEach(company => {
      if (company._refProperties.membershipStatus === 'confirmed') {
        confirmedCompanyLabels.push(company._refProperties.companyLabel)
      }
      if (company._refProperties.membershipStatus === 'pending') {
        pendingCompanyLabels.push(company._refProperties.companyLabel)
      }
    })
    logger.info('TASK ONUPDATE found confirmed relationships for this user: ' + confirmedCompanyLabels.length)
    logger.info('TASK ONUPDATE found pending relationships for this user: ' + pendingCompanyLabels.length)
    newObject.frIndexedMultivalued2 = confirmedCompanyLabels
    newObject.frIndexedMultivalued3 = pendingCompanyLabels
  } else {
    logger.info('TASK ONUPDATE memberOfOrg not found - skipping companies array updates.')
  }
} catch (e) {
  logger.error('TASK ONUPDATE error: ' + e)
}

if (newObject.password !== oldObject.password) {
  var request = {
    'url': 'https://ypdak57qu6.execute-api.eu-west-1.amazonaws.com/default/dummyBCryptValue',
    'method': 'POST',
    'headers': {
      'Content-Type': 'application/json'
    },
    'body': '{"convert": "' + newObject.password + '"}'
  }

  try {
    logger.debug('OnUpdate request: {}', request)
    var result = openidm.action('external/rest', 'call', request)
    logger.debug('OnUpdate result: {}', result)

    var resultJson = JSON.parse(result)
    var bodyJson = JSON.parse(resultJson.body)

    newObject.frIndexedString2 = bodyJson.hash

    // Update related params so we know what type of BCrypt hash it is
    newObject.frIndexedString3 = 'migrated'
    newObject.frIndexedString5 = 'webfiling'
  } catch (e) {
    logger.info('OnUpdate ERROR')
    if (e.javaException.getCode() === '201') {
      logger.info('OnUpdate CODE HTTP: 201')
    } else if (e.javaException.getCode() === '400') {
      logger.info('OnUpdate CODE HTTP: 400')
    }
    logger.info('OnUpdate Error Detail: {}', e)
  }
}