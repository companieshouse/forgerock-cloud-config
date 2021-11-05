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

CURL_COMMAND="curl -s --location --request POST '${fidcServer}/am/oauth2/realms/root/realms/${fidcRealm}/access_token?auth_chain=PasswordGrant' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'grant_type=password' \
--data-urlencode 'username=${username}' \
--data-urlencode 'password=${password}' \
--data-urlencode 'scope=fr:idm:*' \
--data-urlencode 'client_id=${adminClientId}' \
--data-urlencode 'client_secret=${adminClientSecret}'"

CURL_RESPONSE=$(eval ${CURL_COMMAND})
ACCESS_TOKEN=$(echo ${CURL_RESPONSE} | jq -r '.access_token')

echo ${ACCESS_TOKEN}

