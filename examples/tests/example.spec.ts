import { test, expect } from "@playwright/test";

/**
 * Example tests demonstrating the Stanterprise Reporter
 * 
 * These tests show how the reporter captures different scenarios:
 * - Passing tests
 * - Failing tests
 * - Screenshots
 * - Multiple steps
 */

test.describe("Example Tests for Reporter", () => {
  test("passing test example", async ({ page }) => {
    // This test will pass and send a success event
    await page.goto("https://playwright.dev");
    
    await test.step("Check page title", async () => {
      await expect(page).toHaveTitle(/Playwright/);
    });
    
    await test.step("Verify getting started link", async () => {
      const getStarted = page.locator("text=Get started");
      await expect(getStarted).toBeVisible();
    });
  });

  test("test with screenshot", async ({ page }) => {
    await page.goto("https://playwright.dev");
    
    await test.step("Navigate to docs", async () => {
      await page.click("text=Docs");
    });
    
    await test.step("Take screenshot", async () => {
      // This screenshot will be captured as an attachment
      await page.screenshot({ path: "docs-page.png" });
    });
    
    await expect(page).toHaveURL(/.*docs.*/);
  });

  test("test with multiple steps", async ({ page }) => {
    await page.goto("https://playwright.dev");
    
    await test.step("Step 1: Check homepage", async () => {
      await expect(page).toHaveTitle(/Playwright/);
    });
    
    await test.step("Step 2: Navigate to API", async () => {
      await page.click("text=API");
    });
    
    await test.step("Step 3: Search documentation", async () => {
      const searchButton = page.locator('[aria-label="Search"]');
      if (await searchButton.isVisible()) {
        await searchButton.click();
      }
    });
  });

  test.skip("skipped test example", async ({ page }) => {
    // This test is skipped and will be reported as skipped
    await page.goto("https://example.com");
  });

  test("slow test example", async ({ page }) => {
    test.slow(); // This test is marked as slow
    
    await page.goto("https://playwright.dev");
    
    for (let i = 0; i < 3; i++) {
      await test.step(`Iteration ${i + 1}`, async () => {
        await page.reload();
        await expect(page).toHaveTitle(/Playwright/);
      });
    }
  });
});

test.describe("Error Handling Examples", () => {
  test("failing test example", async ({ page }) => {
    await page.goto("https://playwright.dev");
    
    // This will fail and trigger failure reporting
    await expect(page).toHaveTitle(/This Will Fail/);
  });

  test("test with assertion error", async ({ page }) => {
    await page.goto("https://playwright.dev");
    
    await test.step("Valid step", async () => {
      await expect(page).toHaveTitle(/Playwright/);
    });
    
    await test.step("Failing step", async () => {
      // This step will fail
      await expect(page.locator("text=NonExistentElement")).toBeVisible();
    });
  });

  test("timeout test example", async ({ page }) => {
    test.setTimeout(3000); // Set a short timeout to demonstrate timeout handling
    
    await page.goto("https://playwright.dev");
    
    // This will likely timeout
    await page.waitForSelector("text=ElementThatDoesNotExist", { timeout: 5000 });
  });
});
