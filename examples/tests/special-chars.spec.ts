import { test, expect } from "@playwright/test";

test.describe("Suite with special chars: @#$%", () => {
  test("test 1", () => {
    expect(1).toBe(1);
  });

  test.describe("Nested: (brackets) & [square]", () => {
    test("test 2", () => {
      expect(2).toBe(2);
    });
  });
});
