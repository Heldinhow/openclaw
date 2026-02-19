import type { GatewayBrowserClient } from "../gateway.js";
import type { SessionsListResult } from "../types.js";
import type { SubagentInfo } from "../views/subagents.js";

type SubagentsState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  subagentsLoading: boolean;
  subagents: SubagentInfo[];
  subagentsError: string | null;
  subagentsFilter: "all" | "running" | "completed" | "failed";
};

/**
 * Check if a session key is a subagent session
 */
function isSubagentSessionKey(key: string): boolean {
  return key.includes(":subagent:");
}

/**
 * Get subagent info from session key and session data
 */
async function fetchSubagents(client: GatewayBrowserClient): Promise<SubagentInfo[]> {
  try {
    // Call sessions.list to get all sessions
    const result = await client.request<SessionsListResult | undefined>("sessions.list", {
      includeGlobal: true,
      includeUnknown: true,
    });

    if (!result) {
      console.error("Failed to fetch sessions: no result");
      return [];
    }

    const sessions = result.sessions || [];
    const subagents: SubagentInfo[] = [];

    for (const session of sessions) {
      if (!isSubagentSessionKey(session.key)) {
        continue;
      }

      // Determine status based on session properties
      // A subagent is "running" if it has a sessionId and no indication of completion
      const isRunning = session.sessionId && !session.abortedLastRun;
      const status: "running" | "completed" | "failed" = isRunning ? "running" : "completed";

      // Try to get more info from subagent registry if available
      let task = "";
      let label = session.label || session.displayName;
      let startedAt = session.updatedAt || Date.now();
      let endedAt: number | undefined;

      // If not running, consider it ended
      if (!isRunning && session.updatedAt) {
        endedAt = session.updatedAt;
      }

      // Try to fetch subagent details from a custom endpoint (if exists)
      // For now, we'll use the session info available
      const keyParts = session.key.split(":");
      const runId = keyParts[keyParts.length - 1];

      subagents.push({
        id: runId || session.key,
        key: session.key,
        label: label,
        displayName: session.displayName,
        task: task || `Session: ${session.key}`,
        status,
        startedAt,
        endedAt,
        runtime: endedAt ? endedAt - startedAt : undefined,
      });
    }

    return subagents;
  } catch (error) {
    console.error("Error fetching subagents:", error);
    throw error;
  }
}

/**
 * Load subagents from the gateway
 */
export async function loadSubagents(state: SubagentsState): Promise<void> {
  if (!state.client || !state.connected) {
    return;
  }

  state.subagentsLoading = true;
  state.subagentsError = null;

  try {
    const subagents = await fetchSubagents(state.client);
    state.subagents = subagents;
  } catch (error) {
    state.subagentsError = error instanceof Error ? error.message : String(error);
    state.subagents = [];
  } finally {
    state.subagentsLoading = false;
  }
}

/**
 * Refresh subagents
 */
export function refreshSubagents(state: SubagentsState): void {
  void loadSubagents(state);
}
