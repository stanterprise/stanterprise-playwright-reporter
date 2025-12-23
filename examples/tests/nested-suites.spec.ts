import { test, expect } from "@playwright/test";

test.describe("Level 1 Suite", () => {
  test("test at level 1", () => {
    expect(1).toBe(1);
  });

  test.describe("Level 2 Suite A", () => {
    test("test at level 2a", () => {
      expect(2).toBe(2);
    });

    test.describe("Level 3 Suite", () => {
      test("test at level 3", () => {
        expect(3).toBe(3);
      });
    });
  });

  test.describe("Level 2 Suite B", () => {
    test("test at level 2b", () => {
      expect(4).toBe(4);
    });
  });
});
