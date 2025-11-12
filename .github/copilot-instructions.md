# Playwright Custom Reporter Development Guide

## Project Overview

This is a custom Playwright reporter for Stanterprise. Playwright reporters process test results and can output to various formats (HTML, JSON, custom dashboards, etc.).

## Key Architecture Patterns

### Reporter Interface Implementation

- Implement the `Reporter` interface from `@playwright/test/reporter`
- Core methods: `onBegin()`, `onTestBegin()`, `onTestEnd()`, `onEnd()`
- Use TypeScript for type safety with Playwright's reporter types

### File Structure Convention

```
src/
  reporter.ts          # Main reporter class
  types.ts             # Custom type definitions
  formatters/          # Output formatting logic
  utils/               # Helper functions
tests/
  reporter.test.ts     # Reporter unit tests
examples/
  playwright.config.ts # Example usage configuration
tsconfig.json          # TypeScript configuration
```

### Configuration Pattern

- Export reporter as default export from main entry point
- Accept options through constructor: `new StanterpriseReporter(options)`
- Support common options: `outputFile`, `outputFormat`, `includeFailures`, etc.
- Validate configuration in constructor, fail fast on invalid options

### Test Result Processing

- Access test results via `TestResult` objects in `onTestEnd()`
- Use `result.status` for test outcomes: 'passed', 'failed', 'skipped', 'timedOut'
- Extract attachments with `result.attachments` for screenshots/videos
- Get timing data from `result.duration` and `result.startTime`

## Development Workflow

### Setup Commands

```bash
npm init -y
npm install --save-dev @playwright/test typescript @types/node
npm install --save-dev @playwright/test  # Peer dependency
```

### Build & Test

```bash
npm run build    # Compile TypeScript
npm test         # Run reporter tests
npm run example  # Test with example Playwright project
```

### Publishing Pattern

- Use `files` field in package.json to include only built output
- Export main reporter class and types from index.ts
- Follow semantic versioning for breaking changes to reporter interface

## Integration Points

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [["./dist/reporter.js", { outputFile: "results.json" }]],
});
```

### Output Format Considerations

- JSON output should be valid JSON (not JSONL)
- HTML reports should be self-contained (embedded CSS/JS)
- Consider file size for large test suites
- Implement incremental writing for memory efficiency

## Common Patterns

### Error Handling

- Wrap reporter operations in try-catch to prevent breaking Playwright
- Log errors to stderr, not stdout (preserves test output)
- Provide meaningful error messages with configuration hints

### Performance Optimization

- Use streams for large output files
- Batch operations in `onEnd()` rather than per-test processing
- Consider memory usage with large attachment collections

## Testing Strategy

- Mock Playwright's TestResult objects for unit tests
- Create sample test suites for integration testing
- Test reporter with both passing and failing test scenarios
- Verify output format correctness and file generation
