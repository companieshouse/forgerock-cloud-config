# ForgeRock Identity Cloud Configuration

This repository contains scripts and configuration for Companies House ForgeRock Identity Cloud instance. All scripts are used as part of the CI/CD pipeline but can also be ran locally.

## Running Locally

### Pre-Requisites

The following need to be installed and configured for local use:

- [NodeJS](https://nodejs.org/en/download/)

### Environment Variables

| Name     | Description                                        | Default Value | Required           |
| -------- | -------------------------------------------------- | ------------- | ------------------ |
| FRIC_URL | ForgeRock Identity Cloud URL.                      | N/A           | :white_check_mark: |
| PHASE    | Phase number (0-4). Controls which config is used. | 0             |                    |

### Install Dependencies

`npm install`

## Scripts

All scripts can also be ran locally with the correct arguments and environment variables.

### Get Access Token

Calls the Access Management OAuth2 endpoint to get an access token of a user. This token is used for subsequent API calls.

**Help Message:**
`node scripts/get-access-token.js -h`

### Update Managed Objects

Calls the Identity Management endpoint to get update Managed Objects. The configuration is store in JSON files in the `config/managed-objects` directory.

**This command will update all Managed Objects and delete any not present in the directory.**

**Help Message:**
`node scripts/update-managed-objects.js -h`
