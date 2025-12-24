/**
 * Unit tests for time helper functions
 */
import {
  createTimestamp,
  createTimestampFromMs,
  createDuration,
} from "../src/utils/timeHelpers";

describe("timeHelpers", () => {
  describe("createTimestamp", () => {
    it("should create timestamp from Date object", () => {
      const date = new Date("2024-01-01T12:00:00.000Z");
      const timestamp = createTimestamp(date);

      expect(timestamp.seconds).toBe(Math.floor(date.getTime() / 1000));
      expect(timestamp.nanos).toBe((date.getTime() % 1000) * 1000000);
    });

    it("should handle dates with milliseconds", () => {
      const date = new Date("2024-01-01T12:00:00.123Z");
      const timestamp = createTimestamp(date);

      const expectedSeconds = Math.floor(date.getTime() / 1000);
      const expectedNanos = (date.getTime() % 1000) * 1000000;

      expect(timestamp.seconds).toBe(expectedSeconds);
      expect(timestamp.nanos).toBe(expectedNanos);
    });

    it("should throw error for invalid date", () => {
      const invalidDate = new Date("invalid");

      expect(() => createTimestamp(invalidDate)).toThrow(
        "Invalid date provided to createTimestamp"
      );
    });
  });

  describe("createTimestampFromMs", () => {
    it("should create timestamp from milliseconds", () => {
      const ms = 1704110400000; // 2024-01-01T12:00:00.000Z
      const timestamp = createTimestampFromMs(ms);

      expect(timestamp.seconds).toBe(Math.floor(ms / 1000));
      expect(timestamp.nanos).toBe((ms % 1000) * 1000000);
    });

    it("should handle zero milliseconds", () => {
      const timestamp = createTimestampFromMs(0);

      expect(timestamp.seconds).toBe(0);
      expect(timestamp.nanos).toBe(0);
    });

    it("should throw error for NaN milliseconds", () => {
      expect(() => createTimestampFromMs(NaN)).toThrow(
        "Invalid milliseconds provided to createTimestampFromMs"
      );
    });

    it("should throw error for undefined milliseconds", () => {
      expect(() => createTimestampFromMs(undefined as any)).toThrow(
        "Invalid milliseconds provided to createTimestampFromMs"
      );
    });
  });

  describe("createDuration", () => {
    it("should create duration from milliseconds", () => {
      const durationMs = 1500; // 1.5 seconds
      const duration = createDuration(durationMs);

      expect(duration.seconds).toBe(1);
      expect(duration.nanos).toBe(500 * 1000000);
    });

    it("should handle zero duration", () => {
      const duration = createDuration(0);

      expect(duration.seconds).toBe(0);
      expect(duration.nanos).toBe(0);
    });

    it("should handle duration with only milliseconds", () => {
      const duration = createDuration(500);

      expect(duration.seconds).toBe(0);
      expect(duration.nanos).toBe(500 * 1000000);
    });

    it("should handle duration with multiple seconds", () => {
      const duration = createDuration(5250); // 5.25 seconds

      expect(duration.seconds).toBe(5);
      expect(duration.nanos).toBe(250 * 1000000);
    });

    it("should throw error for NaN duration", () => {
      expect(() => createDuration(NaN)).toThrow(
        "Invalid duration provided to createDuration"
      );
    });

    it("should throw error for undefined duration", () => {
      expect(() => createDuration(undefined as any)).toThrow(
        "Invalid duration provided to createDuration"
      );
    });

    it("should throw error for negative duration", () => {
      expect(() => createDuration(-100)).toThrow(
        "Negative duration provided to createDuration"
      );
    });
  });
});
