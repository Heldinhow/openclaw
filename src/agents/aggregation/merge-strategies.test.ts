import { describe, expect, it } from "vitest";
import { applyMergeStrategy } from "./merge-strategies.js";
import type { SubAgentResult } from "./types.js";
import { isValidMergeStrategy, isValidCollectInto, VALID_MERGE_STRATEGIES } from "./types.js";

describe("merge-strategies", () => {
  const createResult = (
    output: string,
    status: "success" | "error" | "timeout" = "success",
    error?: string,
  ): SubAgentResult => ({
    runId: crypto.randomUUID(),
    sessionKey: "test-session",
    status,
    output,
    error,
    completedAt: Date.now(),
  });

  describe("concat", () => {
    it("concatenates all outputs into an array", () => {
      const results = [
        createResult("Result 1"),
        createResult("Result 2"),
        createResult("Result 3"),
      ];

      const aggregated = applyMergeStrategy(results, "concat", "$test");

      expect(aggregated.value).toEqual(["Result 1", "Result 2", "Result 3"]);
      expect(aggregated.errors).toHaveLength(0);
      expect(aggregated.count).toBe(3);
    });

    it("handles empty results", () => {
      const aggregated = applyMergeStrategy([], "concat", "$test");

      expect(aggregated.value).toEqual([]);
      expect(aggregated.count).toBe(0);
    });

    it("filters out error results", () => {
      const results = [
        createResult("Result 1"),
        createResult("Error message", "error", "Error message"),
        createResult("Result 3"),
      ];

      const aggregated = applyMergeStrategy(results, "concat", "$test");

      expect(aggregated.value).toEqual(["Result 1", "Result 3"]);
      expect(aggregated.errors).toContain("Error message");
    });
  });

  describe("json", () => {
    it("creates indexed object from results", () => {
      const results = [
        createResult("Value 1"),
        createResult("Value 2"),
      ];

      const aggregated = applyMergeStrategy(results, "json", "$test");

      expect(aggregated.value).toEqual({
        "0": "Value 1",
        "1": "Value 2",
      });
    });
  });

  describe("merge", () => {
    it("deep merges JSON objects", () => {
      const results = [
        createResult(JSON.stringify({ a: 1, b: 2 })),
        createResult(JSON.stringify({ b: 3, c: 4 })),
      ];

      const aggregated = applyMergeStrategy(results, "merge", "$test");

      expect(aggregated.value).toEqual({ a: 1, b: 3, c: 4 });
    });

    it("skips non-JSON results", () => {
      const results = [
        createResult("not json"),
        createResult(JSON.stringify({ a: 1 })),
      ];

      const aggregated = applyMergeStrategy(results, "merge", "$test");

      expect(aggregated.value).toEqual({ a: 1 });
    });
  });

  describe("first", () => {
    it("returns the first result", () => {
      const results = [
        createResult("First"),
        createResult("Second"),
        createResult("Third"),
      ];

      const aggregated = applyMergeStrategy(results, "first", "$test");

      expect(aggregated.value).toBe("First");
    });

    it("returns undefined for empty results", () => {
      const aggregated = applyMergeStrategy([], "first", "$test");

      expect(aggregated.value).toBeUndefined();
    });
  });

  describe("last", () => {
    it("returns the last result", () => {
      const results = [
        createResult("First"),
        createResult("Second"),
        createResult("Last"),
      ];

      const aggregated = applyMergeStrategy(results, "last", "$test");

      expect(aggregated.value).toBe("Last");
    });

    it("returns undefined for empty results", () => {
      const aggregated = applyMergeStrategy([], "last", "$test");

      expect(aggregated.value).toBeUndefined();
    });
  });

  describe("custom", () => {
    it("applies custom function to results", () => {
      const results = [createResult("a"), createResult("b"), createResult("c")];

      const aggregated = applyMergeStrategy(
        results,
        "custom",
        "$test",
        "function(r) { return r.join('-'); }",
      );

      expect(aggregated.value).toBe("a-b-c");
    });

    it("falls back to concat if no custom function provided", () => {
      const results = [createResult("a"), createResult("b")];

      const aggregated = applyMergeStrategy(results, "custom", "$test");

      expect(aggregated.value).toEqual(["a", "b"]);
    });

    it("returns error object if custom function fails", () => {
      const results = [createResult("a"), createResult("b")];

      const aggregated = applyMergeStrategy(results, "custom", "$test", "() => throw new Error()");

      expect(aggregated.value).toHaveProperty("error");
    });
  });
});

describe("types validation", () => {
  describe("isValidMergeStrategy", () => {
    it("returns true for valid strategies", () => {
      for (const strategy of VALID_MERGE_STRATEGIES) {
        expect(isValidMergeStrategy(strategy)).toBe(true);
      }
    });

    it("returns false for invalid strategies", () => {
      expect(isValidMergeStrategy("invalid")).toBe(false);
      expect(isValidMergeStrategy("")).toBe(false);
    });
  });

  describe("isValidCollectInto", () => {
    it("returns true for variables starting with $", () => {
      expect(isValidCollectInto("$research")).toBe(true);
      expect(isValidCollectInto("$var")).toBe(true);
    });

    it("returns false for invalid variable names", () => {
      expect(isValidCollectInto("research")).toBe(false);
      expect(isValidCollectInto("")).toBe(false);
      expect(isValidCollectInto(undefined as unknown as string)).toBe(false);
    });
  });
});
