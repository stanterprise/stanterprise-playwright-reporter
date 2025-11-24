# GitHub Actions Workflows

This repository uses GitHub Actions for continuous integration and automated NPM publishing.

## Workflows

### CI (`ci.yml`)

Runs on every push to `master` branch and on pull requests.

**What it does:**
- Tests the package on Node.js versions 18 and 20
- Runs all tests
- Builds the package
- Validates package creation

### Publish to NPM (`publish.yml`)

Runs automatically when a version tag (e.g., `v1.0.0`) is pushed to the repository.

**What it does:**
- Runs tests
- Builds the package
- Publishes to NPM with provenance (supply chain security)

## Setup Instructions

### NPM_TOKEN Secret

To enable automated publishing, you need to configure an NPM access token as a GitHub secret:

1. **Create an NPM Access Token:**
   - Log in to [npmjs.com](https://www.npmjs.com/)
   - Go to your account settings → Access Tokens
   - Click "Generate New Token" → "Classic Token"
   - Select "Automation" type (for CI/CD)
   - Copy the generated token

2. **Add Token to GitHub:**
   - Go to your GitHub repository
   - Navigate to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Paste your NPM token
   - Click "Add secret"

3. **Test the Workflow:**
   - Create and push a version tag:
     ```bash
     npm version patch
     git push --follow-tags
     ```
   - The publish workflow will automatically run and publish to NPM

## Workflow Triggers

- **CI**: Runs on push to `main`/`develop` and all pull requests
- **Publish**: Runs only on tags matching `v*` pattern (e.g., `v1.0.0`, `v2.1.3`)

## Publishing Process

The automated publishing workflow follows these steps:

1. Checkout the tagged commit
2. Setup Node.js 20 with NPM registry configuration
3. Install dependencies (`npm ci`)
4. Run tests (`npm test`)
5. Build the package (`npm run build`)
6. Publish to NPM with provenance attestation

The workflow uses `--provenance` flag to generate supply chain attestations, providing transparency about where and how the package was built.
