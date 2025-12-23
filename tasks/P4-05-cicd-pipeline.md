# P4-05: CI/CD Pipeline ⚪

**Priority**: LOW  
**Effort**: 2-3 hours  
**Status**: ⚠️ NOT STARTED - FUTURE ENHANCEMENT

> **Note**: Automated CI/CD pipeline would streamline releases but is infrastructure work, not core functionality.

## Problem

No automated CI/CD pipeline means:

- Manual testing before releases
- No automated publishing
- Inconsistent release process
- No continuous quality checks

## Solution

Set up GitHub Actions for CI/CD.

## Implementation

**File**: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x, 22.x]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        if: matrix.node-version == '20.x'
        with:
          files: ./coverage/lcov.info
```

**File**: `.github/workflows/publish.yml`

```yaml
name: Publish to NPM

on:
  push:
    tags:
      - "v*"

jobs:
  publish:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20.x"
          registry-url: "https://registry.npmjs.org"

      - run: npm ci
      - run: npm test
      - run: npm run build

      - name: Publish to NPM
        run: npm publish --provenance
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          draft: false
          prerelease: false
```

**File**: `.github/workflows/lint.yml`

```yaml
name: Lint

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20.x"

      - run: npm ci
      - run: npm run lint # requires adding lint script
      - run: npm run type-check # npx tsc --noEmit
```

## Additional Workflows

- **Dependabot**: Automated dependency updates
- **CodeQL**: Security scanning
- **Release Drafter**: Auto-generate release notes

## Files to Create

- `.github/workflows/ci.yml`
- `.github/workflows/publish.yml`
- `.github/workflows/lint.yml`

## Configuration Needed

- Add NPM_TOKEN secret to GitHub repo
- Configure branch protection rules
- Set up status checks

---

_Created: December 17, 2025_
