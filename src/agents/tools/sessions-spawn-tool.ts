import { Type } from "@sinclair/typebox";
import type { GatewayMessageChannel } from "../../utils/message-channel.js";
import { optionalStringEnum } from "../schema/typebox.js";
import { spawnSubagent } from "../subagent-spawn.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult, readStringParam } from "./common.js";

const SessionsSpawnToolSchema = Type.Object({
  task: Type.Union([Type.String(), Type.Array(Type.String())]),
  label: Type.Optional(Type.String()),
  agentId: Type.Optional(Type.String()),
  model: Type.Optional(Type.String()),
  thinking: Type.Optional(Type.String()),
  runTimeoutSeconds: Type.Optional(Type.Number({ minimum: 0 })),
  // Back-compat: older callers used timeoutSeconds for this tool.
  timeoutSeconds: Type.Optional(Type.Number({ minimum: 0 })),
  cleanup: optionalStringEnum(["delete", "keep"] as const),
  // Aggregation parameters
  collectInto: Type.Optional(Type.String()),
  mergeStrategy: Type.Optional(
    Type.Union([
      Type.Literal("concat"),
      Type.Literal("json"),
      Type.Literal("merge"),
      Type.Literal("first"),
      Type.Literal("last"),
      Type.Literal("custom"),
    ]),
  ),
  customFunction: Type.Optional(Type.String()),
  // Parallel spawning parameters
  parallel: Type.Optional(Type.Boolean()),
  count: Type.Optional(Type.Number({ minimum: 1 })),
  concurrent: Type.Optional(Type.Number({ minimum: 1 })),
  // Chain/dependency parameters
  chainAfter: Type.Optional(Type.String()),
  dependsOn: Type.Optional(Type.String()),
  includeDependencyResult: Type.Optional(Type.Boolean()),
  // Retry parameters
  retryCount: Type.Optional(Type.Number({ minimum: 0 })),
  retryDelay: Type.Optional(Type.Number({ minimum: 0 })),
  retryBackoff: Type.Optional(
    Type.Union([Type.Literal("fixed"), Type.Literal("exponential"), Type.Literal("linear")]),
  ),
  retryOn: Type.Optional(Type.Array(Type.String())),
  retryMaxTime: Type.Optional(Type.Number({ minimum: 0 })),
  // Context sharing parameter
  sharedContext: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});

export function createSessionsSpawnTool(opts?: {
  agentSessionKey?: string;
  agentChannel?: GatewayMessageChannel;
  agentAccountId?: string;
  agentTo?: string;
  agentThreadId?: string | number;
  agentGroupId?: string | null;
  agentGroupChannel?: string | null;
  agentGroupSpace?: string | null;
  sandboxed?: boolean;
  /** Explicit agent ID override for cron/hook sessions where session key parsing may not work. */
  requesterAgentIdOverride?: string;
}): AnyAgentTool {
  return {
    label: "Sessions",
    name: "sessions_spawn",
    description:
      "Spawn a background sub-agent run in an isolated session and announce the result back to the requester chat.",
    parameters: SessionsSpawnToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const taskParam = params.task;

      // Handle task as string or array
      let tasks: string[];
      if (Array.isArray(taskParam)) {
        tasks = taskParam.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
      } else {
        const task = readStringParam(params, "task", { required: true });
        tasks = [task];
      }

      const label = typeof params.label === "string" ? params.label.trim() : "";
      const requestedAgentId = readStringParam(params, "agentId");
      const modelOverride = readStringParam(params, "model");
      const thinkingOverrideRaw = readStringParam(params, "thinking");
      const cleanup =
        params.cleanup === "keep" || params.cleanup === "delete" ? params.cleanup : "keep";
      // Back-compat: older callers used timeoutSeconds for this tool.
      const timeoutSecondsCandidate =
        typeof params.runTimeoutSeconds === "number"
          ? params.runTimeoutSeconds
          : typeof params.timeoutSeconds === "number"
            ? params.timeoutSeconds
            : undefined;
      const runTimeoutSeconds =
        typeof timeoutSecondsCandidate === "number" && Number.isFinite(timeoutSecondsCandidate)
          ? Math.max(0, Math.floor(timeoutSecondsCandidate))
          : undefined;

      const collectInto = readStringParam(params, "collectInto");
      const mergeStrategy = readStringParam(params, "mergeStrategy");
      const customFunction = readStringParam(params, "customFunction");

      // Parallel spawning parameters
      const parallel = params.parallel === true;
      const count = typeof params.count === "number" && params.count > 0 ? params.count : 1;
      const concurrent =
        typeof params.concurrent === "number" && params.concurrent > 0 ? params.concurrent : 0;

      // Chain/dependency parameters
      const chainAfter = readStringParam(params, "chainAfter");
      const dependsOn = readStringParam(params, "dependsOn");
      const includeDependencyResult = params.includeDependencyResult === true;

      // Retry parameters
      const retryCount =
        typeof params.retryCount === "number" && params.retryCount >= 0
          ? Math.floor(params.retryCount)
          : 0;
      const retryDelay =
        typeof params.retryDelay === "number" && params.retryDelay >= 0
          ? Math.floor(params.retryDelay)
          : 1000;
      const retryBackoff =
        params.retryBackoff === "fixed" || params.retryBackoff === "linear"
          ? params.retryBackoff
          : "exponential";
      const retryOn = Array.isArray(params.retryOn)
        ? params.retryOn.filter((p): p is string => typeof p === "string")
        : undefined;
      const retryMaxTime =
        typeof params.retryMaxTime === "number" && params.retryMaxTime >= 0
          ? Math.floor(params.retryMaxTime)
          : undefined;

      // Shared context parameter
      const sharedContext =
        params.sharedContext && typeof params.sharedContext === "object"
          ? (params.sharedContext as Record<string, unknown>)
          : undefined;

      // Resolve dependency runId (chainAfter takes precedence, dependsOn is alias)
      const dependencyRunId = chainAfter || dependsOn;

      // Validate collectInto if provided
      if (collectInto !== undefined && !collectInto.startsWith("$")) {
        return jsonResult({
          error: 'collectInto must start with "$" (e.g., "$research")',
          code: "INVALID_COLLECT_INTO",
        });
      }

      // Determine final task list
      let finalTasks: string[];
      if (parallel || tasks.length > 1) {
        // Multiple tasks provided or parallel flag set
        if (tasks.length > 1) {
          finalTasks = tasks;
        } else if (count > 1) {
          // Single task with count - repeat it
          finalTasks = Array(count).fill(tasks[0]);
        } else {
          finalTasks = tasks;
        }
      } else {
        finalTasks = tasks;
      }

      // If not parallel and only one task, use spawnSubagent (which handles retries)
      if (!parallel && finalTasks.length === 1) {
        const result = await spawnSubagent(
          {
            task: finalTasks[0],
            label: label || undefined,
            agentId: requestedAgentId,
            model: modelOverride,
            thinking: thinkingOverrideRaw,
            runTimeoutSeconds,
            cleanup,
            expectsCompletionMessage: true,
            aggregation:
              collectInto !== undefined
                ? {
                    collectInto,
                    mergeStrategy: mergeStrategy as
                      | "concat"
                      | "json"
                      | "merge"
                      | "first"
                      | "last"
                      | "custom"
                      | undefined,
                    customFunction,
                  }
                : undefined,
            chainAfter: dependencyRunId,
            includeDependencyResult,
            retryCount,
            retryDelay,
            retryBackoff,
            retryOn,
            retryMaxTime,
            sharedContext,
          },
          {
            agentSessionKey: opts?.agentSessionKey,
            agentChannel: opts?.agentChannel,
            agentAccountId: opts?.agentAccountId,
            agentTo: opts?.agentTo,
            agentThreadId: opts?.agentThreadId,
            agentGroupId: opts?.agentGroupId,
            agentGroupChannel: opts?.agentGroupChannel,
            agentGroupSpace: opts?.agentGroupSpace,
            requesterAgentIdOverride: opts?.requesterAgentIdOverride,
          },
        );
        return jsonResult(result);
      }

      // Parallel spawning
      const maxConcurrent =
        concurrent > 0 ? Math.min(concurrent, finalTasks.length) : finalTasks.length;
      const results: Awaited<ReturnType<typeof spawnSubagent>>[] = [];

      // Process in batches respecting concurrent limit
      for (let i = 0; i < finalTasks.length; i += maxConcurrent) {
        const batch = finalTasks.slice(i, i + maxConcurrent);
        const batchResults = await Promise.all(
          batch.map((task, idx) =>
            spawnSubagent(
              {
                task,
                label: label ? `${label}-${i + idx + 1}` : undefined,
                agentId: requestedAgentId,
                model: modelOverride,
                thinking: thinkingOverrideRaw,
                runTimeoutSeconds,
                cleanup,
                expectsCompletionMessage: true,
                aggregation:
                  collectInto !== undefined
                    ? {
                        collectInto,
                        mergeStrategy: mergeStrategy as
                          | "concat"
                          | "json"
                          | "merge"
                          | "first"
                          | "last"
                          | "custom"
                          | undefined,
                        customFunction,
                      }
                    : undefined,
                chainAfter: dependencyRunId,
                includeDependencyResult,
                retryCount,
                retryDelay,
                retryBackoff,
                retryOn,
                retryMaxTime,
                sharedContext,
              },
              {
                agentSessionKey: opts?.agentSessionKey,
                agentChannel: opts?.agentChannel,
                agentAccountId: opts?.agentAccountId,
                agentTo: opts?.agentTo,
                agentThreadId: opts?.agentThreadId,
                agentGroupId: opts?.agentGroupId,
                agentGroupChannel: opts?.agentGroupChannel,
                agentGroupSpace: opts?.agentGroupSpace,
                requesterAgentIdOverride: opts?.requesterAgentIdOverride,
              },
            ),
          ),
        );
        results.push(...batchResults);
      }

      // Return array of results
      const accepted = results.filter((r) => r.status === "accepted");
      const failed = results.filter((r) => r.status !== "accepted");

      return jsonResult({
        status: failed.length === 0 ? "accepted" : "partial",
        spawned: results.length,
        accepted: accepted.length,
        failed: failed.length,
        results: results.map((r) => ({
          status: r.status,
          childSessionKey: r.childSessionKey,
          runId: r.runId,
          error: r.error,
        })),
        note: `Spawned ${results.length} sub-agent(s) in parallel. Use runIds to track individual runs.`,
      });
    },
  };
}
