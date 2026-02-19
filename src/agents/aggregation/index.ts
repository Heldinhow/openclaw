import { applyMergeStrategy } from "./merge-strategies.js";
import type {
  AggregationGroup,
  SpawnAggregationParams,
  SubAgentResult,
  SubAgentResults,
} from "./types.js";
import {
  DEFAULT_MERGE_STRATEGY,
  isValidCollectInto,
  isValidMergeStrategy,
} from "./types.js";

const aggregationGroups = new Map<string, AggregationGroup>();

export function getAggregationGroupKey(sessionKey: string, variableName: string): string {
  return `${sessionKey}:${variableName}`;
}

export function createAggregationGroup(
  sessionKey: string,
  params: SpawnAggregationParams,
): AggregationGroup | null {
  if (!isValidCollectInto(params.collectInto)) {
    return null;
  }

  const rawStrategy = params.mergeStrategy || "";
  const strategy = isValidMergeStrategy(rawStrategy) ? rawStrategy : DEFAULT_MERGE_STRATEGY;

  const group: AggregationGroup = {
    id: crypto.randomUUID(),
    sessionKey,
    variableName: params.collectInto,
    mergeStrategy: strategy,
    customFunction: params.customFunction,
    subAgentRunIds: [],
    results: [],
    status: "pending",
    createdAt: Date.now(),
  };

  const key = getAggregationGroupKey(sessionKey, params.collectInto);
  aggregationGroups.set(key, group);
  return group;
}

export function addSubAgentToGroup(
  sessionKey: string,
  variableName: string,
  runId: string,
): AggregationGroup | null {
  const key = getAggregationGroupKey(sessionKey, variableName);
  const group = aggregationGroups.get(key);

  if (!group) {
    return null;
  }

  group.subAgentRunIds.push(runId);
  group.status = "partial";
  return group;
}

export function addResultToGroup(
  sessionKey: string,
  variableName: string,
  result: SubAgentResult,
): AggregationGroup | null {
  const key = getAggregationGroupKey(sessionKey, variableName);
  const group = aggregationGroups.get(key);

  if (!group) {
    return null;
  }

  group.results.push(result);

  const hasPending = group.results.length < group.subAgentRunIds.length;
  if (!hasPending) {
    group.status = "complete";
    group.completedAt = Date.now();
  }

  return group;
}

export function getAggregatedResult(
  sessionKey: string,
  variableName: string,
): SubAgentResults[string] | null {
  const key = getAggregationGroupKey(sessionKey, variableName);
  const group = aggregationGroups.get(key);

  if (!group || group.status !== "complete") {
    return null;
  }

  return applyMergeStrategy(
    group.results,
    group.mergeStrategy,
    group.variableName,
    group.customFunction,
  );
}

export function getAllAggregatedResults(sessionKey: string): SubAgentResults {
  const results: SubAgentResults = {};

  for (const [key, group] of aggregationGroups) {
    if (key.startsWith(sessionKey) && group.status === "complete") {
      results[group.variableName] = applyMergeStrategy(
        group.results,
        group.mergeStrategy,
        group.variableName,
        group.customFunction,
      );
    }
  }

  return results;
}

export function getAggregationGroup(
  sessionKey: string,
  variableName: string,
): AggregationGroup | null {
  const key = getAggregationGroupKey(sessionKey, variableName);
  return aggregationGroups.get(key) || null;
}

export function clearAggregationGroups(sessionKey: string): void {
  for (const key of aggregationGroups.keys()) {
    if (key.startsWith(sessionKey)) {
      aggregationGroups.delete(key);
    }
  }
}

/**
 * Check if there are any pending (partial or complete but not delivered) aggregated results
 * for a given session. This includes groups that have started receiving results but may
 * not yet be complete.
 */
export function hasPendingAggregatedResults(sessionKey: string): boolean {
  for (const [key, group] of aggregationGroups) {
    if (key.startsWith(sessionKey) && (group.status === "partial" || group.status === "pending")) {
      return true;
    }
  }
  return false;
}

/**
 * Get all pending (partial or pending) aggregation groups for a session.
 * Returns a map of variableName to group.
 */
export function getPendingAggregationGroups(sessionKey: string): Map<string, AggregationGroup> {
  const pending = new Map<string, AggregationGroup>();
  for (const [key, group] of aggregationGroups) {
    if (key.startsWith(sessionKey) && (group.status === "partial" || group.status === "pending")) {
      pending.set(group.variableName, group);
    }
  }
  return pending;
}

export function handleSubagentResult(
  requesterSessionKey: string,
  runId: string,
  childSessionKey: string,
  outcome: { status: "ok" | "error" | "timeout"; error?: string },
  output?: string,
): void {
  for (const group of aggregationGroups.values()) {
    if (group.sessionKey !== requesterSessionKey) {
      continue;
    }
    if (!group.subAgentRunIds.includes(runId)) {
      continue;
    }
    const result: SubAgentResult = {
      runId,
      sessionKey: childSessionKey,
      status: outcome.status === "ok" ? "success" : outcome.status === "timeout" ? "timeout" : "error",
      output,
      error: outcome.error,
      completedAt: Date.now(),
    };
    addResultToGroup(requesterSessionKey, group.variableName, result);
    break;
  }
}
