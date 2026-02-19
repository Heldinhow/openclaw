import crypto from "node:crypto";
import { formatThinkingLevels, normalizeThinkLevel } from "../auto-reply/thinking.js";
import { loadConfig } from "../config/config.js";
import { callGateway } from "../gateway/call.js";
import { normalizeAgentId, parseAgentSessionKey } from "../routing/session-key.js";
import { normalizeDeliveryContext } from "../utils/delivery-context.js";
import { resolveAgentConfig } from "./agent-scope.js";
import { createAggregationGroup, addSubAgentToGroup } from "./aggregation/index.js";
import type { SpawnAggregationParams } from "./aggregation/types.js";
import { AGENT_LANE_SUBAGENT } from "./lanes.js";
import { resolveSubagentSpawnModelSelection } from "./model-selection.js";
import { buildSubagentSystemPrompt } from "./subagent-announce.js";
import { getSubagentDepthFromSessionStore } from "./subagent-depth.js";
import {
  countActiveRunsForSession,
  getSubagentRunStatus,
  getParentSharedContext,
  registerSubagentRun,
  storeSharedContext,
  waitForSubagentRunCompletion,
} from "./subagent-registry.js";
import { readStringParam } from "./tools/common.js";
import {
  resolveDisplaySessionKey,
  resolveInternalSessionKey,
  resolveMainSessionAlias,
} from "./tools/sessions-helpers.js";

export type SpawnSubagentParams = {
  task: string;
  label?: string;
  agentId?: string;
  model?: string;
  thinking?: string;
  runTimeoutSeconds?: number;
  cleanup?: "delete" | "keep";
  expectsCompletionMessage?: boolean;
  aggregation?: SpawnAggregationParams;
  // Parallel spawning parameters
  parallel?: boolean;
  count?: number;
  concurrent?: number;
  tasks?: string[];
  // Chain/dependency parameters
  chainAfter?: string;
  dependsOn?: string;
  includeDependencyResult?: boolean;
  // Retry parameters
  retryCount?: number;
  retryDelay?: number;
  retryBackoff?: "fixed" | "exponential" | "linear";
  retryOn?: string[];
  retryMaxTime?: number;
  // Context sharing parameter
  sharedContext?: Record<string, unknown>;
};

export type SpawnSubagentContext = {
  agentSessionKey?: string;
  agentChannel?: string;
  agentAccountId?: string;
  agentTo?: string;
  agentThreadId?: string | number;
  agentGroupId?: string | null;
  agentGroupChannel?: string | null;
  agentGroupSpace?: string | null;
  requesterAgentIdOverride?: string;
};

export const SUBAGENT_SPAWN_ACCEPTED_NOTE =
  "auto-announces on completion, do not poll/sleep. The response will be sent back as an agent message.";

export type SpawnSubagentResult = {
  status: "accepted" | "forbidden" | "error";
  childSessionKey?: string;
  runId?: string;
  note?: string;
  modelApplied?: boolean;
  error?: string;
};

export function splitModelRef(ref?: string) {
  if (!ref) {
    return { provider: undefined, model: undefined };
  }
  const trimmed = ref.trim();
  if (!trimmed) {
    return { provider: undefined, model: undefined };
  }
  const [provider, model] = trimmed.split("/", 2);
  if (model) {
    return { provider, model };
  }
  return { provider: undefined, model: trimmed };
}

export type RetryBackoffStrategy = "fixed" | "exponential" | "linear";

export function calculateDelay(
  attempt: number,
  baseDelay: number,
  strategy: RetryBackoffStrategy,
): number {
  switch (strategy) {
    case "exponential":
      return baseDelay * Math.pow(2, attempt);
    case "linear":
      return baseDelay * (attempt + 1);
    case "fixed":
    default:
      return baseDelay;
  }
}

export function isRetryableError(
  errorMessage: string,
  retryOnPatterns: string[] | undefined,
): boolean {
  if (!retryOnPatterns || retryOnPatterns.length === 0) {
    return true;
  }
  const lowerErrorMessage = errorMessage.toLowerCase();
  return retryOnPatterns.some((pattern) => lowerErrorMessage.includes(pattern.toLowerCase()));
}

export async function spawnSubagent(
  params: SpawnSubagentParams,
  ctx: SpawnSubagentContext,
): Promise<SpawnSubagentResult> {
  const retryCount = params.retryCount ?? 0;
  const retryDelay = params.retryDelay ?? 1000;
  const retryBackoff = params.retryBackoff ?? "exponential";
  const retryOn = params.retryOn;
  const retryMaxTime = params.retryMaxTime;

  const startTime = Date.now();

  let lastResult: SpawnSubagentResult | undefined;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    lastResult = await spawnSubagentDirect(params, ctx);

    if (lastResult.status === "accepted") {
      return lastResult;
    }

    if (attempt < retryCount) {
      const errorMessage = lastResult?.error ?? "";

      if (!isRetryableError(errorMessage, retryOn)) {
        return lastResult;
      }

      if (retryMaxTime !== undefined) {
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime >= retryMaxTime) {
          return lastResult;
        }
      }

      const delay = calculateDelay(attempt, retryDelay, retryBackoff);

      const remainingTime =
        retryMaxTime !== undefined ? retryMaxTime - (Date.now() - startTime) : undefined;
      const actualDelay = remainingTime !== undefined ? Math.min(delay, remainingTime) : delay;

      if (actualDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, actualDelay));
      }
    }
  }

  return lastResult ?? { status: "error", error: "Unknown error during spawn" };
}

export async function spawnSubagentDirect(
  params: SpawnSubagentParams,
  ctx: SpawnSubagentContext,
): Promise<SpawnSubagentResult> {
  let task = params.task;
  const label = params.label?.trim() || "";
  const requestedAgentId = params.agentId;
  const modelOverride = params.model;
  const thinkingOverrideRaw = params.thinking;
  const cleanup =
    params.cleanup === "keep" || params.cleanup === "delete" ? params.cleanup : "keep";
  const requesterOrigin = normalizeDeliveryContext({
    channel: ctx.agentChannel,
    accountId: ctx.agentAccountId,
    to: ctx.agentTo,
    threadId: ctx.agentThreadId,
  });
  const runTimeoutSeconds =
    typeof params.runTimeoutSeconds === "number" && Number.isFinite(params.runTimeoutSeconds)
      ? Math.max(0, Math.floor(params.runTimeoutSeconds))
      : 0;
  let modelApplied = false;

  const cfg = loadConfig();
  const { mainKey, alias } = resolveMainSessionAlias(cfg);
  const requesterSessionKey = ctx.agentSessionKey;
  const requesterInternalKey = requesterSessionKey
    ? resolveInternalSessionKey({
        key: requesterSessionKey,
        alias,
        mainKey,
      })
    : alias;
  const requesterDisplayKey = resolveDisplaySessionKey({
    key: requesterInternalKey,
    alias,
    mainKey,
  });

  const callerDepth = getSubagentDepthFromSessionStore(requesterInternalKey, { cfg });
  const maxSpawnDepth = cfg.agents?.defaults?.subagents?.maxSpawnDepth ?? 1;
  if (callerDepth >= maxSpawnDepth) {
    return {
      status: "forbidden",
      error: `sessions_spawn is not allowed at this depth (current depth: ${callerDepth}, max: ${maxSpawnDepth})`,
    };
  }

  const maxChildren = cfg.agents?.defaults?.subagents?.maxChildrenPerAgent ?? 5;
  const activeChildren = countActiveRunsForSession(requesterInternalKey);
  if (activeChildren >= maxChildren) {
    return {
      status: "forbidden",
      error: `sessions_spawn has reached max active children for this session (${activeChildren}/${maxChildren})`,
    };
  }

  // Handle chainAfter/dependsOn - wait for dependency to complete
  const dependencyRunId = params.chainAfter || params.dependsOn;
  let dependencyResult: string | undefined;
  if (dependencyRunId) {
    const dependencyStatus = getSubagentRunStatus(dependencyRunId);

    // If dependency run doesn't exist, fail
    if (!dependencyStatus.exists) {
      return {
        status: "error",
        error: `Dependency run not found: ${dependencyRunId}`,
      };
    }

    // If dependency hasn't completed yet, wait for it
    if (!dependencyStatus.completed) {
      const waitResult = await waitForSubagentRunCompletion(dependencyRunId);

      if (!waitResult.completed) {
        return {
          status: "error",
          error: waitResult.error || `Dependency run ${dependencyRunId} did not complete`,
        };
      }

      // Check if dependency failed
      if (waitResult.outcome === "error" || waitResult.outcome === "timeout") {
        return {
          status: "error",
          error: `Dependency run ${dependencyRunId} ${waitResult.outcome}: ${waitResult.error || "unknown error"}`,
        };
      }
    } else if (dependencyStatus.outcome === "error" || dependencyStatus.outcome === "timeout") {
      return {
        status: "error",
        error: `Dependency run ${dependencyRunId} ${dependencyStatus.outcome}: ${dependencyStatus.error || "unknown error"}`,
      };
    }

    // Get the dependency result if requested
    if (params.includeDependencyResult && dependencyStatus.childSessionKey) {
      try {
        const historyResponse = await callGateway<{
          messages: Array<{ role: string; content: string }>;
        }>({
          method: "sessions.history",
          params: {
            sessionKey: dependencyStatus.childSessionKey,
            limit: 10,
          },
          timeoutMs: 10_000,
        });

        if (historyResponse?.messages && historyResponse.messages.length > 0) {
          // Get the last assistant message as the result
          const assistantMessages = historyResponse.messages
            .filter((m) => m.role === "assistant")
            .toReversed();
          if (assistantMessages.length > 0) {
            dependencyResult = assistantMessages[0].content;
          }
        }
      } catch {
        // Ignore errors getting history - continue without dependency result
      }
    }
  }

  // Prepend dependency result to task if requested
  if (dependencyResult) {
    task = `[Previous step result]:\n${dependencyResult}\n\n[Current task]:\n${task}`;
  }

  const requesterAgentId = normalizeAgentId(
    ctx.requesterAgentIdOverride ?? parseAgentSessionKey(requesterInternalKey)?.agentId,
  );
  const targetAgentId = requestedAgentId ? normalizeAgentId(requestedAgentId) : requesterAgentId;
  if (targetAgentId !== requesterAgentId) {
    const allowAgents = resolveAgentConfig(cfg, requesterAgentId)?.subagents?.allowAgents ?? [];
    const allowAny = allowAgents.some((value) => value.trim() === "*");
    const normalizedTargetId = targetAgentId.toLowerCase();
    const allowSet = new Set(
      allowAgents
        .filter((value) => value.trim() && value.trim() !== "*")
        .map((value) => normalizeAgentId(value).toLowerCase()),
    );
    if (!allowAny && !allowSet.has(normalizedTargetId)) {
      const allowedText = allowSet.size > 0 ? Array.from(allowSet).join(", ") : "none";
      return {
        status: "forbidden",
        error: `agentId is not allowed for sessions_spawn (allowed: ${allowedText})`,
      };
    }
  }
  const childSessionKey = `agent:${targetAgentId}:subagent:${crypto.randomUUID()}`;
  const childDepth = callerDepth + 1;
  const spawnedByKey = requesterInternalKey;
  const targetAgentConfig = resolveAgentConfig(cfg, targetAgentId);
  const resolvedModel = resolveSubagentSpawnModelSelection({
    cfg,
    agentId: targetAgentId,
    modelOverride,
  });

  const resolvedThinkingDefaultRaw =
    readStringParam(targetAgentConfig?.subagents ?? {}, "thinking") ??
    readStringParam(cfg.agents?.defaults?.subagents ?? {}, "thinking");

  let thinkingOverride: string | undefined;
  const thinkingCandidateRaw = thinkingOverrideRaw || resolvedThinkingDefaultRaw;
  if (thinkingCandidateRaw) {
    const normalized = normalizeThinkLevel(thinkingCandidateRaw);
    if (!normalized) {
      const { provider, model } = splitModelRef(resolvedModel);
      const hint = formatThinkingLevels(provider, model);
      return {
        status: "error",
        error: `Invalid thinking level "${thinkingCandidateRaw}". Use one of: ${hint}.`,
      };
    }
    thinkingOverride = normalized;
  }
  try {
    await callGateway({
      method: "sessions.patch",
      params: { key: childSessionKey, spawnDepth: childDepth },
      timeoutMs: 10_000,
    });
  } catch (err) {
    const messageText =
      err instanceof Error ? err.message : typeof err === "string" ? err : "error";
    return {
      status: "error",
      error: messageText,
      childSessionKey,
    };
  }

  if (resolvedModel) {
    try {
      await callGateway({
        method: "sessions.patch",
        params: { key: childSessionKey, model: resolvedModel },
        timeoutMs: 10_000,
      });
      modelApplied = true;
    } catch (err) {
      const messageText =
        err instanceof Error ? err.message : typeof err === "string" ? err : "error";
      return {
        status: "error",
        error: messageText,
        childSessionKey,
      };
    }
  }
  if (thinkingOverride !== undefined) {
    try {
      await callGateway({
        method: "sessions.patch",
        params: {
          key: childSessionKey,
          thinkingLevel: thinkingOverride === "off" ? null : thinkingOverride,
        },
        timeoutMs: 10_000,
      });
    } catch (err) {
      const messageText =
        err instanceof Error ? err.message : typeof err === "string" ? err : "error";
      return {
        status: "error",
        error: messageText,
        childSessionKey,
      };
    }
  }
  // Get parent shared context and merge with provided context
  const parentSharedContext = getParentSharedContext(requesterInternalKey);
  const providedSharedContext = params.sharedContext;
  let mergedSharedContext: Record<string, unknown> | undefined;

  if (parentSharedContext || providedSharedContext) {
    mergedSharedContext = { ...parentSharedContext, ...providedSharedContext };
  } else {
    mergedSharedContext = providedSharedContext;
  }

  const childSystemPrompt = buildSubagentSystemPrompt({
    requesterSessionKey,
    requesterOrigin,
    childSessionKey,
    label: label || undefined,
    task,
    childDepth,
    maxSpawnDepth,
    sharedContext: mergedSharedContext,
  });
  const childTaskMessage = [
    `[Subagent Context] You are running as a subagent (depth ${childDepth}/${maxSpawnDepth}). Results auto-announce to your requester; do not busy-poll for status.`,
    `[Subagent Task]: ${task}`,
  ].join("\n\n");

  const childIdem = crypto.randomUUID();
  let childRunId: string = childIdem;
  try {
    const response = await callGateway<{ runId: string }>({
      method: "agent",
      params: {
        message: childTaskMessage,
        sessionKey: childSessionKey,
        channel: requesterOrigin?.channel,
        to: requesterOrigin?.to ?? undefined,
        accountId: requesterOrigin?.accountId ?? undefined,
        threadId: requesterOrigin?.threadId != null ? String(requesterOrigin.threadId) : undefined,
        idempotencyKey: childIdem,
        deliver: false,
        lane: AGENT_LANE_SUBAGENT,
        extraSystemPrompt: childSystemPrompt,
        thinking: thinkingOverride,
        timeout: runTimeoutSeconds,
        label: label || undefined,
        spawnedBy: spawnedByKey,
        groupId: ctx.agentGroupId ?? undefined,
        groupChannel: ctx.agentGroupChannel ?? undefined,
        groupSpace: ctx.agentGroupSpace ?? undefined,
      },
      timeoutMs: 10_000,
    });
    if (typeof response?.runId === "string" && response.runId) {
      childRunId = response.runId;
    }
  } catch (err) {
    const messageText =
      err instanceof Error ? err.message : typeof err === "string" ? err : "error";
    return {
      status: "error",
      error: messageText,
      childSessionKey,
      runId: childRunId,
    };
  }

  registerSubagentRun({
    runId: childRunId,
    childSessionKey,
    requesterSessionKey: requesterInternalKey,
    requesterOrigin,
    requesterDisplayKey,
    task,
    cleanup,
    label: label || undefined,
    model: resolvedModel,
    runTimeoutSeconds,
    expectsCompletionMessage: params.expectsCompletionMessage === true,
    aggregation: params.aggregation,
    retryConfig:
      params.retryCount !== undefined && params.retryCount > 0
        ? {
            retryCount: params.retryCount,
            retryDelay: params.retryDelay ?? 1000,
            retryBackoff: params.retryBackoff ?? "exponential",
            retryOn: params.retryOn,
            retryMaxTime: params.retryMaxTime,
          }
        : undefined,
    originalTask: task,
    originalLabel: label || undefined,
  });

  // Store shared context for this run (available to child sub-agents)
  if (mergedSharedContext && Object.keys(mergedSharedContext).length > 0) {
    storeSharedContext(childRunId, mergedSharedContext);
  }

  if (params.aggregation) {
    createAggregationGroup(requesterInternalKey, params.aggregation);
    addSubAgentToGroup(requesterInternalKey, params.aggregation.collectInto, childRunId);
  }

  return {
    status: "accepted",
    childSessionKey,
    runId: childRunId,
    note: SUBAGENT_SPAWN_ACCEPTED_NOTE,
    modelApplied: resolvedModel ? modelApplied : undefined,
  };
}
