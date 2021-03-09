# ForgeRock Identity Cloud Configuration

This repository contains scripts and configuration for Companies House ForgeRock Identity Cloud instance. All scripts are used as part of the CI/CD pipeline but can also be ran locally.

## Running Locally

### Pre-Requisites

The following need to be installed/configured for local use:

- [NodeJS](https://nodejs.org/en/download/)
- [ForgeRock Identity Cloud User](https://backstage.forgerock.com/docs/idcloud/latest/paas/tenant/postman-collection.html#preparing_your_identity_cloud)
- [ForgeRock Identity Cloud Admin OAuth Client](https://backstage.forgerock.com/docs/idcloud/latest/paas/tenant/postman-collection.html#running_the_prerequisite_steps)

### Environment Variables

| Name     | Description                                        | Default Value | Required           |
| -------- | -------------------------------------------------- | ------------- | ------------------ |
| FIDC_URL | ForgeRock Identity Cloud URL.                      | N/A           | :white_check_mark: |
| PHASE    | Phase number (0-4). Controls which config is used. | 0             |                    |

### Install Dependencies

`npm install`

### Run tests locally

`npm test`

## Scripts

All scripts can also be ran locally with the correct arguments and environment variables.

### Update Managed Objects

Calls the Identity Management endpoint to update Managed Objects. The configuration is stored in JSON files in the `config/managed-objects` directory.

**This command will update all Managed Objects and delete any not present in the directory.**

**Help Message:**
`update-managed-objects -h`

### Update Auth Trees

Calls the Access Management endpoint to update Authentication Trees. The configuration is stored in JSON files in the `config/auth-trees` directory.

**Help Message:**
`update-auth-trees -h`

### User Roles

Calls the Identity Management endpoint to update User Roles. The configuration is stored in JSON files in the `config/user-roles` directory.

**Help Message:**
`update-user-roles -h`

### Internal Roles

Calls the Identity Management endpoint to update Internal Roles. The configuration is stored in JSON files in the `config/internal-roles` directory.

**Help Message:**
`update-internal-roles -h`

### Update AM Scripts

Calls the Access Management endpoint to update AM Scripts. The configuration is stored in JSON files in the `config/am-scripts` directory.

**Help Message:**
`scripts/update-scripts -h`

### Update AM CORS Configuration

Calls the Access Management endpoint to update AM CORS Configuration. The configuration is stored in JSON files in the `config/cors` directory.

**Help Message:**
`scripts/update-cors -h`

### Update Applications Configuration

Calls the Access Management endpoint to update applications. The configuration is stored in JSON files in the `config/application` directory.

**Help Message:**
`scripts/update-application -h`

### Update Services

Calls the Access Management endpoint to update services. The configuration is stored in JSON files in the `config/services` directory. Config files with sensitive values are stored using the `.tpl` extension and placeholders used for the value. The script will need updating to handle the any new replacements.

**Help Message:**
`scripts/update-services -h`
