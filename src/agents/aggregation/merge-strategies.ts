import type { MergeStrategy, SubAgentResult, AggregatedResult } from "./types.js";

export function applyMergeStrategy(
  results: SubAgentResult[],
  strategy: MergeStrategy,
  variableName: string,
  customFunction?: string,
): AggregatedResult {
  const successfulResults = results.filter((r) => r.status === "success");
  const errors = results
    .filter((r) => r.status !== "success")
    .map((r) => r.error || "Unknown error");

  let value: unknown;

  switch (strategy) {
    case "concat":
      value = applyConcatStrategy(successfulResults);
      break;
    case "json":
      value = applyJsonStrategy(successfulResults);
      break;
    case "merge":
      value = applyMergeStrategyImpl(successfulResults);
      break;
    case "first":
      value = applyFirstStrategy(successfulResults);
      break;
    case "last":
      value = applyLastStrategy(successfulResults);
      break;
    case "custom":
      value = applyCustomStrategy(successfulResults, customFunction);
      break;
    default:
      value = applyConcatStrategy(successfulResults);
  }

  return {
    variableName,
    strategy,
    value,
    errors,
    completedAt: Date.now(),
    count: results.length,
  };
}

function applyConcatStrategy(results: SubAgentResult[]): unknown[] {
  return results.map((r) => r.output);
}

function applyJsonStrategy(results: SubAgentResult[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  results.forEach((r, index) => {
    obj[String(index)] = r.output;
  });
  return obj;
}

function applyMergeStrategyImpl(results: SubAgentResult[]): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const result of results) {
    if (result.output) {
      try {
        const parsed = JSON.parse(result.output);
        if (typeof parsed === "object" && parsed !== null) {
          deepMerge(merged, parsed);
        }
      } catch {
        // If not valid JSON, skip merging
      }
    }
  }
  return merged;
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = target[key];
    if (
      typeof sourceValue === "object" &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === "object" &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>,
      );
    } else {
      target[key] = sourceValue;
    }
  }
}

function applyFirstStrategy(results: SubAgentResult[]): unknown {
  if (results.length === 0) {
    return undefined;
  }
  return results[0].output;
}

function applyLastStrategy(results: SubAgentResult[]): unknown {
  if (results.length === 0) {
    return undefined;
  }
  return results[results.length - 1].output;
}

function applyCustomStrategy(results: SubAgentResult[], customFunction?: string): unknown {
  if (!customFunction) {
    return applyConcatStrategy(results);
  }

  try {
    // eslint-disable-next-line no-implied-eval
    const outputs = results.map((r) => r.output);
    const fn = new Function("results", `return ${customFunction}(results);`);
    return fn(outputs);
  } catch {
    return {
      error: "Custom merge function failed",
      originalResults: results.map((r) => r.output),
    };
  }
}
