import { exec } from "node:child_process";
import { promisify } from "node:util";
import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "./common.js";
import { jsonResult } from "./common.js";

const execAsync = promisify(exec);

const OpencodeSchema = Type.Object({
  instruction: Type.String({ description: "Instruction for OpenCode to execute" }),
  directory: Type.Optional(Type.String()),
  model: Type.Optional(Type.String()),
  agent: Type.Optional(Type.String()),
  format: Type.Optional(Type.String()),
});

export function createOpencodeTool(): AnyAgentTool {
  return {
    label: "OpenCode",
    name: "opencode",
    description:
      "Execute code implementation using OpenCode CLI. Use this to create, modify, or implement code based on specifications.",
    parameters: OpencodeSchema,
    execute: async (_toolCallId, args) => {
      const instruction = args.instruction as string;
      const directory = args.directory as string | undefined;
      const model = args.model as string | undefined;
      const agent = args.agent as string | undefined;
      const format = args.format as string | undefined;

      const workdir = directory || process.cwd();

      let cmd = `cd "${workdir}" && opencode run "${instruction.replace(/"/g, '\\"')}"`;

      if (model) {
        cmd += ` --model ${model}`;
      }

      if (agent) {
        cmd = `cd "${workdir}" && opencode --agent ${agent} run "${instruction.replace(/"/g, '\\"')}"`;
      }

      if (format === "json") {
        cmd += ` --format json`;
      }

      try {
        const { stdout, stderr } = await execAsync(cmd, {
          timeout: 300000,
          maxBuffer: 50 * 1024 * 1024,
          env: {
            ...process.env,
            PATH: `/root/.opencode/bin:${process.env.PATH}`,
          },
        });

        return jsonResult({
          success: true,
          instruction: instruction.substring(0, 100),
          stdout: stdout || "(no output)",
          stderr: stderr || "(no errors)",
          workingDirectory: workdir,
        });
      } catch (error) {
        const err = error as { message?: string; stdout?: string; stderr?: string; code?: number };
        return jsonResult({
          success: false,
          instruction: instruction.substring(0, 100),
          error: err.message || "Unknown error",
          exitCode: err.code,
          stdout: err.stdout || "",
          stderr: err.stderr || "",
          workingDirectory: workdir,
        });
      }
    },
  };
}
