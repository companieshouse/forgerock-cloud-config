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

```
npm install
npm link
```

### Run tests locally

`npm test`

## Scripts

All scripts can also be ran locally using the CLI with the correct arguments and environment variables.

The available CLI commands can be found using the help option: `update-fidc -h`

Each command also has it's own help option, for example: `update-fidc applications -h`
