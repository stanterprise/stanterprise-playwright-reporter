import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { initDebugFile, writeDebugEntry } from "../src/utils/debugLogger";
import { StanterpriseReporterOptions } from "../src/types";

describe("debugLogger", () => {
  let tempDir: string;
  let debugFilePath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "stanterprise-debug-test-"));
    debugFilePath = path.join(tempDir, "test-debug.jsonl");
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("initDebugFile", () => {
    it("should create an empty file when debug is enabled", () => {
      const options: StanterpriseReporterOptions = { debug: true, debugFile: debugFilePath };

      initDebugFile(options);

      expect(fs.existsSync(debugFilePath)).toBe(true);
      expect(fs.readFileSync(debugFilePath, "utf8")).toBe("");
    });

    it("should truncate an existing file when debug is enabled", () => {
      fs.writeFileSync(debugFilePath, "existing content\n");
      const options: StanterpriseReporterOptions = { debug: true, debugFile: debugFilePath };

      initDebugFile(options);

      expect(fs.readFileSync(debugFilePath, "utf8")).toBe("");
    });

    it("should do nothing when debug is disabled", () => {
      const options: StanterpriseReporterOptions = { debug: false, debugFile: debugFilePath };

      initDebugFile(options);

      expect(fs.existsSync(debugFilePath)).toBe(false);
    });

    it("should do nothing when debug is undefined", () => {
      const options: StanterpriseReporterOptions = { debugFile: debugFilePath };

      initDebugFile(options);

      expect(fs.existsSync(debugFilePath)).toBe(false);
    });
  });

  describe("writeDebugEntry", () => {
    beforeEach(() => {
      // Initialize a fresh file before each write test
      fs.writeFileSync(debugFilePath, "");
    });

    it("should write a JSONL entry when debug is enabled", () => {
      const options: StanterpriseReporterOptions = { debug: true, debugFile: debugFilePath };
      const message = { run_id: "test-run-123", name: "My Run" };

      writeDebugEntry(options, "/testsystem.v1.observer.TestEventCollector/ReportRunStart", message);

      const content = fs.readFileSync(debugFilePath, "utf8");
      const lines = content.trim().split("\n");
      expect(lines).toHaveLength(1);

      const entry = JSON.parse(lines[0]);
      expect(entry.path).toBe("/testsystem.v1.observer.TestEventCollector/ReportRunStart");
      expect(entry.message).toEqual(message);
      expect(typeof entry.timestamp).toBe("string");
      expect(() => new Date(entry.timestamp)).not.toThrow();
    });

    it("should append multiple JSONL entries in order", () => {
      const options: StanterpriseReporterOptions = { debug: true, debugFile: debugFilePath };

      writeDebugEntry(options, "/path/MethodOne", { id: 1 });
      writeDebugEntry(options, "/path/MethodTwo", { id: 2 });
      writeDebugEntry(options, "/path/MethodThree", { id: 3 });

      const content = fs.readFileSync(debugFilePath, "utf8");
      const lines = content.trim().split("\n");
      expect(lines).toHaveLength(3);

      expect(JSON.parse(lines[0]).path).toBe("/path/MethodOne");
      expect(JSON.parse(lines[1]).path).toBe("/path/MethodTwo");
      expect(JSON.parse(lines[2]).path).toBe("/path/MethodThree");
    });

    it("should do nothing when debug is disabled", () => {
      const options: StanterpriseReporterOptions = { debug: false, debugFile: debugFilePath };

      writeDebugEntry(options, "/path/Method", { id: 1 });

      expect(fs.readFileSync(debugFilePath, "utf8")).toBe("");
    });

    it("should do nothing when debug is undefined", () => {
      const options: StanterpriseReporterOptions = { debugFile: debugFilePath };

      writeDebugEntry(options, "/path/Method", { id: 1 });

      expect(fs.readFileSync(debugFilePath, "utf8")).toBe("");
    });

    it("should include a valid ISO timestamp in each entry", () => {
      const before = new Date();
      const options: StanterpriseReporterOptions = { debug: true, debugFile: debugFilePath };

      writeDebugEntry(options, "/path/Method", {});

      const after = new Date();
      const content = fs.readFileSync(debugFilePath, "utf8");
      const entry = JSON.parse(content.trim());
      const entryTime = new Date(entry.timestamp);

      expect(entryTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(entryTime.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("should serialize complex message objects", () => {
      const options: StanterpriseReporterOptions = { debug: true, debugFile: debugFilePath };
      const message = {
        run_id: "abc",
        test_case: { id: "t1", name: "my test", tags: ["smoke", "regression"] },
        metadata: { env: "ci", version: "1.0" },
      };

      writeDebugEntry(options, "/path/ReportTestEnd", message);

      const content = fs.readFileSync(debugFilePath, "utf8");
      const entry = JSON.parse(content.trim());
      expect(entry.message).toEqual(message);
    });
  });
});
