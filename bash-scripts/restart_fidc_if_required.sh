#!/bin/bash

#################################################
# Restart FIDC if the required marker file exists
#################################################

usage() {
  echo "Usage: $0 [ -a username ] [ -b password] [ -c concourseUserPassword ] [ -d concourseAdminClientSecret]"
  exit 1
}

unset username
unset password
unset concourseUserPassword
unset concourseAdminClientSecret

while getopts ha:b:c:d: flag
do
    case "${flag}" in
        h) usage;;
        a) username=${OPTARG};;
        b) password=${OPTARG};;
        c) concourseUserPassword=${OPTARG};;
        d) concourseAdminClientSecret=${OPTARG};;
        *) usage;;
    esac
done

if [[ ( -z "${FIDC_URL}" )]]; then
  echo "Please set FIDC_URL and re-try, quitting."
  usage
fi

if [[ ( -z "${username}" ) || ( -z "${password}" ) || ( -z "${concourseUserPassword}" ) || ( -z "${concourseAdminClientSecret}" ) ]]; then
    echo "Invalid or missing arguments, quitting."
    usage
fi

if [ -f "FIDC_RESTART_REQUIRED.txt" ]; then
  echo "Triggering restart of FIDC, as marker file 'FIDC_RESTART_REQUIRED.txt' present."
  node index.js restart-fidc -u "${username}" -p "${password}" --iu "ConcourseUser@companieshouse.gov.uk" --ip "${concourseUserPassword}" -a "ConcourseAdminClient" -s "${concourseAdminClientSecret}"
  echo "Restart exit code = $?"
else
  echo "No restart required, as marker file 'FIDC_RESTART_REQUIRED.txt' missing."
fi

