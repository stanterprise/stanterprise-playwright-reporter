# P2-05: Remove Unused Utilities 🟡

**Priority**: HIGH  
**Effort**: 30 minutes  
**Status**: ✅ COMPLETE

> **Refactored**: The `src/utils/suiteMapper.ts` file mentioned in this task no longer exists. The codebase has been cleaned up. Empty/stub handler files may still exist (onSuiteBeginHandler.ts, onSuiteEndHandler.ts, onEndHandler.ts) but these might be intentional placeholders.

## Problem

The file `src/utils/suiteMapper.ts` exists but only contains imports with no actual implementation or exports:

```typescript
import { Suite } from "@playwright/test/reporter";
import { testSuite } from "@stanterprise/protobuf";

const SuiteType = testSuite.v1.entities.SuiteType;
```

This creates:

- Dead code in the codebase
- Confusion about its purpose
- Unused imports
- Unnecessary file to maintain

## Solution

Either:

1. **Remove the file** if functionality not needed
2. **Implement intended functionality** if it was planned but incomplete

Based on the codebase review, suite mapping is handled directly in `reporter.ts`, so this file appears to be leftover from earlier development.

## Implementation Steps

### Step 1: Verify No Dependencies

```bash
# Search for any imports of suiteMapper
grep -r "from.*suiteMapper" src/
grep -r "suiteMapper" tests/
```

Expected: No results (file is not imported anywhere)

### Step 2: Remove the File

```bash
rm src/utils/suiteMapper.ts
```

### Step 3: Verify Build Still Works

```bash
npm run build
```

Expected: Clean build with no errors

### Step 4: Verify Tests Still Pass

```bash
npm test
```

Expected: All tests pass

### Step 5: Update Documentation (if needed)

If the file was mentioned anywhere in documentation, remove those references.

## Alternative: Implement Suite Mapping (If Needed Later)

If suite type mapping functionality is actually needed, here's what it could look like:

**File**: `src/utils/suiteMapper.ts`

```typescript
import type { Suite } from "@playwright/test/reporter";
import { testSuite } from "@stanterprise/protobuf";

const SuiteType = testSuite.v1.entities.SuiteType;

/**
 * Map Playwright suite type to protobuf SuiteType
 */
export function mapSuiteType(suite: Suite): number {
  switch (suite.type) {
    case "root":
      return SuiteType.ROOT;
    case "project":
      return SuiteType.PROJECT;
    case "file":
      return SuiteType.FILE;
    case "describe":
      return SuiteType.DESCRIBE;
    default:
      return SuiteType.UNKNOWN;
  }
}

/**
 * Get suite hierarchy level (0 = root, 1 = first level, etc.)
 */
export function getSuiteLevel(suite: Suite): number {
  let level = 0;
  let current = suite.parent;

  while (current) {
    level++;
    current = current.parent;
  }

  return level;
}

/**
 * Get full suite path as array
 */
export function getSuitePath(suite: Suite): string[] {
  const path: string[] = [];
  let current: Suite | undefined = suite;

  while (current) {
    if (current.title) {
      path.unshift(current.title);
    }
    current = current.parent;
  }

  return path;
}
```

Then export from `src/utils/index.ts`:

```typescript
export * from "./suiteMapper";
```

And add tests in `tests/suiteMapper.test.ts`:

```typescript
import {
  mapSuiteType,
  getSuiteLevel,
  getSuitePath,
} from "../src/utils/suiteMapper";
import { createMockSuite } from "./helpers/mocks";

describe("suiteMapper", () => {
  describe("mapSuiteType", () => {
    it("should map suite types correctly", () => {
      const rootSuite = createMockSuite({ type: "root" });
      const describeSuite = createMockSuite({ type: "describe" });

      expect(mapSuiteType(rootSuite)).toBe(/* expected value */);
      expect(mapSuiteType(describeSuite)).toBe(/* expected value */);
    });
  });

  describe("getSuiteLevel", () => {
    it("should calculate suite hierarchy level", () => {
      const parent = createMockSuite({ title: "Parent" });
      const child = createMockSuite({ title: "Child", parent });

      expect(getSuiteLevel(parent)).toBe(1); // Assuming root is 0
      expect(getSuiteLevel(child)).toBe(2);
    });
  });

  describe("getSuitePath", () => {
    it("should return full suite path", () => {
      const grandparent = createMockSuite({ title: "Grandparent" });
      const parent = createMockSuite({ title: "Parent", parent: grandparent });
      const child = createMockSuite({ title: "Child", parent });

      expect(getSuitePath(child)).toEqual(["Grandparent", "Parent", "Child"]);
    });
  });
});
```

## Decision Point

**Recommendation**: **Remove the file** unless there's a clear need for suite type mapping utilities. The current implementation in `reporter.ts` handles suite functionality adequately.

## Testing

After removal:

```bash
# Clean build
npm run clean
npm run build

# All tests pass
npm test

# No linting errors
npm run lint  # if lint script exists
```

## Acceptance Criteria

- [ ] File removed (or properly implemented)
- [ ] No import errors
- [ ] Build succeeds
- [ ] All tests pass
- [ ] No references to removed file remain

## Files to Remove

- `src/utils/suiteMapper.ts`

## Files to Modify

None (unless implementing functionality)

## Dependencies

None - standalone cleanup task

## Related Tasks

- P1-04: Fix Suite Hierarchy (may need suite utilities)
- Could create this functionality as part of P1-04 if needed

---

_Created: December 17, 2025_
