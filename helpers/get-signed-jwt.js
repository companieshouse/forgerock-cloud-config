const crypto = require('node:crypto')
const { importJWK, SignJWT } = require('jose')

const getSignedJWT = async (serviceAccountId, serviceAccountKey, requestUrl) => {
  const jwkObject = JSON.parse(serviceAccountKey.replaceAll('\\', ''))
  const algorithm = 'RS256'

  const jti = crypto.randomBytes(16).toString('base64')
  const privateKey = await importJWK(jwkObject, algorithm)

  const signedJWT = await new SignJWT({})
    .setProtectedHeader({ alg: algorithm })
    .setIssuedAt()
    .setIssuer(serviceAccountId)
    .setSubject(serviceAccountId)
    .setAudience(requestUrl)
    .setExpirationTime('5m')
    .setJti(jti)
    .sign(privateKey)

  return signedJWT
}
module.exports = getSignedJWT
