/**
 * Result Aggregation Module
 *
 * Types for sub-agent result aggregation feature.
 */

export type MergeStrategy =
  | "concat"
  | "json"
  | "merge"
  | "first"
  | "last"
  | "custom";

export type AggregationGroupStatus = "pending" | "partial" | "complete";

export type SubAgentStatus = "success" | "error" | "timeout";

export interface SubAgentResult {
  runId: string;
  sessionKey: string;
  status: SubAgentStatus;
  output?: string;
  error?: string;
  completedAt: number;
}

export interface AggregationGroup {
  id: string;
  sessionKey: string;
  variableName: string;
  mergeStrategy: MergeStrategy;
  customFunction?: string;
  subAgentRunIds: string[];
  results: SubAgentResult[];
  status: AggregationGroupStatus;
  createdAt: number;
  completedAt?: number;
}

export interface AggregatedResult {
  variableName: string;
  strategy: MergeStrategy;
  value: unknown;
  errors: string[];
  completedAt: number;
  count: number;
}

export interface SubAgentResults {
  [variableName: string]: AggregatedResult;
}

export interface SpawnAggregationParams {
  collectInto: string;
  mergeStrategy?: MergeStrategy;
  customFunction?: string;
}

export const VALID_MERGE_STRATEGIES: MergeStrategy[] = [
  "concat",
  "json",
  "merge",
  "first",
  "last",
  "custom",
];

export const DEFAULT_MERGE_STRATEGY: MergeStrategy = "concat";

export function isValidMergeStrategy(strategy: string): strategy is MergeStrategy {
  return VALID_MERGE_STRATEGIES.includes(strategy as MergeStrategy);
}

export function isValidCollectInto(variableName: string): boolean {
  return typeof variableName === "string" && variableName.startsWith("$");
}
