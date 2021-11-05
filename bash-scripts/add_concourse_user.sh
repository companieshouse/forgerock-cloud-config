#!/bin/bash

#####################################################
# Add/Edit the Concourse Pipleline FIDC Managed User
#####################################################

usage() {
  echo "Usage: $0  [ -t templateFile ] [ -c concourseUserPassword ] [ -u username ] [ -p password] [ -a adminClientId ] [ -s adminClientSecret ] [ -f fidcServerUrl ] [ -r fidcRealm (optional) ]"
  exit 1
}

unset templateFile
unset concourseUserPassword
unset username
unset password
unset adminClientId
unset adminClientSecret
unset fidcServer
unset fidcRealm

while getopts ht:c:u:p:a:s:f:r: flag
do
    case "${flag}" in
        h) usage;;
        t) templateFile=${OPTARG};;
        c) concourseUserPassword=${OPTARG};;
        u) username=${OPTARG};;
        p) password=${OPTARG};;
        a) adminClientId=${OPTARG};;
        s) adminClientSecret=${OPTARG};;
        f) fidcServer=${OPTARG};;
        r) fidcRealm=${OPTARG};;
        *) usage;;
    esac
done

#echo "Template File: $templateFile";
#echo "Concourse User Password: $concourseUserPassword";
#echo "FIDC Server: $fidcServer";
#echo "FIDC Realm: $fidcRealm";

if [[  ( -z "${templateFile}" ) || ( -z "${concourseUserPassword}" ) || ( -z "${username}" ) || ( -z "${password}" ) || ( -z "${adminClientId}" ) || ( -z "${adminClientSecret}" ) || ( -z "${fidcServer}" ) ]]; then
    echo "Invalid or missing arguments, quitting."
    usage
fi

if [[ ( -z "${fidcRealm}" ) ]]; then
    fidcRealm="alpha"
fi

ACCESS_TOKEN=$(sh get_idm_access_token.sh -u ${username} -p ${password} -a ${adminClientId} -s ${adminClientSecret} -f ${fidcServer})

TEMPLATE_FILE_COMMAND="cat ${templateFile} | sed 's/{CONCOURSE_USER_PASSWORD\}/${concourseUserPassword}/g'"
TEMPLATE_MERGED=$(eval ${TEMPLATE_FILE_COMMAND})

CURL_COMMAND="curl -s --write-out '%{http_code}' --output /dev/null --location --request PUT '${fidcServer}/openidm/managed/${fidcRealm}_user/2f077b77-2f0c-40bc-8abd-f7e43df287fe' \
--header 'Authorization: Bearer ${ACCESS_TOKEN}' \
--header 'Content-Type: application/json' \
--data-raw '${TEMPLATE_MERGED}'"

CURL_RESPONSE=$(eval ${CURL_COMMAND})

if [[ ! ( ( "${CURL_RESPONSE}" == "200" ) || ( "${CURL_RESPONSE}" == "201" ) ) ]]; then
  echo "Curl error, response was ${CURL_RESPONSE}, quitting."
  exit 1
fi
