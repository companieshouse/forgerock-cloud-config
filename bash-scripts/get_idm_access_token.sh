#!/bin/bash

#############################################
# Obtain an access token from the IDM Server
#############################################

usage() {
  echo "Usage: $0 [ -u username ] [ -p password] [ -a adminClientId ] [ -s adminClientSecret ] [ -f fidcServerUrl ] [ -r fidcRealm (optional) ]"
  exit 1
}

unset username
unset password
unset adminClientId
unset adminClientSecret
unset fidcServer
unset fidcRealm

while getopts hu:p:a:s:f:r: flag
do
    case "${flag}" in
        h) usage;;
        u) username=${OPTARG};;
        p) password=${OPTARG};;
        a) adminClientId=${OPTARG};;
        s) adminClientSecret=${OPTARG};;
        f) fidcServer=${OPTARG};;
        r) fidcRealm=${OPTARG};;
        *) usage;;
    esac
done

#echo "Username: $username";
#echo "Password: $password";
#echo "Admin Client Id: $adminClientId";
#echo "Admin Client Secret: $adminClientSecret";
#echo "FIDC Server: $fidcServer";
#echo "FIDC Realm: $fidcRealm";

if [[ ( -z "${username}" ) || ( -z "${password}" ) || ( -z "${adminClientId}" ) || ( -z "${adminClientSecret}" ) || ( -z "${fidcServer}" ) ]]; then
    echo "Invalid or missing arguments, quitting."
    usage
fi

if [[ ( -z "${fidcRealm}" ) ]]; then
    fidcRealm="alpha"
fi

#################################
# 1. GET AM ADMIN SESSION
#################################

CURL_COMMAND="curl --silent --location --request POST '${fidcServer}/am/json/authenticate' \
              --header 'Accept-API-Version: protocol=1.0,resource=2.1' \
              --header 'X-OpenAM-Username: ${username}' \
              --header 'X-OpenAM-Password: ${password}'"

CURL_RESPONSE=$(eval ${CURL_COMMAND})

AUTH_ID=$(echo ${CURL_RESPONSE} | jq -r '.authId')

####################################
# 2. GET AM ADMIN SESSION - SKIP 2FA
####################################

CURL_COMMAND="$(cat get_am_admin_session_skip_2fa.txt | sed "s/AUTH_ID/${AUTH_ID}/g" | sed "s#FIDC_SERVER#${fidcServer}#g")"

CURL_RESPONSE=$(eval ${CURL_COMMAND})

TOKEN_ID=$(echo ${CURL_RESPONSE} | jq -r '.tokenId')

#################################
# 3. GET IDM ADMIN AUTH CODE
#################################

CURL_COMMAND="curl -v --silent --location --request GET '${fidcServer}/am/oauth2/authorize?redirect_uri=${fidcServer}/platform/appAuthHelperRedirect.html&client_id=idmAdminClient&response_type=code&scope=fr:idm:*&code_challenge=gX2yL78GGlz3QHsQZKPf96twOmUBKxn1-IXPd5_EHdA&code_challenge_method=S256' \
              --header 'Cookie: amlbcookie=01; dd8758f44f45905=${TOKEN_ID}'"

CURL_RESPONSE=$(eval ${CURL_COMMAND} 2>&1 | grep "< location:")

CODE=$(echo ${CURL_RESPONSE} | cut -d'=' -f2 | cut -d'&' -f1)

#################################
# 1. GET IDM ADMIN TOKEN
#################################

CURL_COMMAND="curl --silent --location --request POST '${fidcServer}/am/oauth2/access_token' \
              --header 'Content-Type: application/x-www-form-urlencoded' \
              --data-urlencode 'redirect_uri=${fidcServer}/platform/appAuthHelperRedirect.html' \
              --data-urlencode 'grant_type=authorization_code' \
              --data-urlencode 'client_id=idmAdminClient' \
              --data-urlencode 'code=${CODE}' \
              --data-urlencode 'code_verifier=codeverifier'"

CURL_RESPONSE=$(eval ${CURL_COMMAND})

ACCESS_TOKEN=$(echo ${CURL_RESPONSE} | jq -r '.access_token')

echo ${ACCESS_TOKEN}