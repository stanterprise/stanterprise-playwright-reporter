/**
 * Test to verify metadata serialization works correctly with protobuf
 */
import { TestCaseRun } from "@stanterprise/protobuf/testsystem/v1/entities";
import { TestStatus } from "@stanterprise/protobuf/testsystem/v1/common";

describe("Metadata Serialization", () => {
  it("should serialize metadata correctly when using Map", () => {
    // Build metadata as object (cleaner)
    const metadata: Record<string, string> = {
      annotation_0_type: "slow",
      annotation_0_description: "This test is slow",
      result_annotation_0_type: "flaky",
    };

    // Convert to Map before passing to protobuf (required for serialization)
    const testCase = new TestCaseRun({
      id: "test-1",
      name: "Example Test",
      run_id: "run-123",
      test_suite_id: "suite-456",
      status: TestStatus.PASSED,
      metadata: new Map(Object.entries(metadata)),
      tags: [],
    });

    // This should not throw
    expect(() => testCase.serializeBinary()).not.toThrow();

    const serialized = testCase.serializeBinary();
    expect(serialized).toBeInstanceOf(Uint8Array);
    expect(serialized.length).toBeGreaterThan(0);
  });

  it("should fail to serialize when metadata is a plain object", () => {
    // This demonstrates the bug - plain objects don't serialize
    const metadata: Record<string, string> = {
      key1: "value1",
      key2: "value2",
    };

    const testCase = new TestCaseRun({
      id: "test-1",
      name: "Example Test",
      run_id: "run-123",
      test_suite_id: "suite-456",
      status: TestStatus.PASSED,
      metadata: metadata as any, // Force it to accept plain object
      tags: [],
    });

    // This will throw "metadata is not iterable"
    expect(() => testCase.serializeBinary()).toThrow(/not iterable/);
  });

  it("should handle empty metadata correctly", () => {
    const testCase = new TestCaseRun({
      id: "test-1",
      name: "Example Test",
      run_id: "run-123",
      test_suite_id: "suite-456",
      status: TestStatus.PASSED,
      metadata: new Map(),
      tags: [],
    });

    expect(() => testCase.serializeBinary()).not.toThrow();
  });

  it("should handle metadata with special characters", () => {
    const metadata: Record<string, string> = {
      "special-key": "value with spaces",
      emoji_key: "🎉",
      unicode_key: "中文",
    };

    const testCase = new TestCaseRun({
      id: "test-1",
      name: "Example Test",
      run_id: "run-123",
      test_suite_id: "suite-456",
      status: TestStatus.PASSED,
      metadata: new Map(Object.entries(metadata)),
      tags: [],
    });

    expect(() => testCase.serializeBinary()).not.toThrow();
    const serialized = testCase.serializeBinary();
    expect(serialized.length).toBeGreaterThan(0);
  });
});
