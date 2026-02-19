import { Type } from "@sinclair/typebox";
import { resolveInternalSessionKey, resolveMainSessionAlias } from "./sessions-helpers.js";
import { loadConfig } from "../../config/config.js";
import { getAllAggregatedResults } from "../aggregation/index.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult } from "./common.js";

const SubagentResultsToolSchema = Type.Object({});

export function createSubagentResultsTool(opts?: {
  agentSessionKey?: string;
}): AnyAgentTool {
  return {
    label: "Subagent Results",
    name: "subagent_results",
    description:
      "Get aggregated results from sub-agents spawned with collectInto parameter. Returns results grouped by variable name.",
    parameters: SubagentResultsToolSchema,
    execute: async () => {
      const cfg = loadConfig();
      const { mainKey, alias } = resolveMainSessionAlias(cfg);
      const sessionKey =
        typeof opts?.agentSessionKey === "string" && opts.agentSessionKey.trim()
          ? resolveInternalSessionKey({
              key: opts.agentSessionKey,
              alias,
              mainKey,
            })
          : alias;

      const results = getAllAggregatedResults(sessionKey);
      return jsonResult(results);
    },
  };
}
