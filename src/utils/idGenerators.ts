import { Suite, TestCase, TestStep } from "@playwright/test/reporter";
import crypto from "crypto";

/**
 * Generates a unique suite ID based on the suite's title path.
 * @param suite The Playwright Suite object.
 * @returns A unique string ID for the suite.
 */
export function generateSuiteId(suite: Suite): string {
  return crypto
    .createHash("sha256")
    .update(suite.titlePath().join(":"))
    .digest("hex");
}

/**
 * Generates a unique test ID based on the test case. Currently uses the test's existing ID.
 * @param test The Playwright TestCase object.
 * @returns A unique string ID for the test case.
 */
export function generateTestId(test: TestCase): string {
  return test.id;
}

/**
 * Generates a unique step ID based on the step and its parent test case.
 * @param step The Playwright TestStep object.
 * @param test The Playwright TestCase object that the step belongs to.
 * @returns A unique string ID for the step.
 */
export function generateStepId(step: TestStep, test: TestCase): string {
  return crypto
    .createHash("sha256")
    .update(`${test.id}:${step.titlePath().join(":")}`)
    .digest("hex");
}
