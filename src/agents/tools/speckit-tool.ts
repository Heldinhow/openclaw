import { exec } from "node:child_process";
import { promisify } from "node:util";
import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "./common.js";
import { jsonResult } from "./common.js";

const execAsync = promisify(exec);

const SpeckitSchema = Type.Object({
  command: Type.Union([Type.Literal("init"), Type.Literal("check")]),
  directory: Type.Optional(Type.String()),
  force: Type.Optional(Type.Boolean()),
});

export function createSpeckitTool(): AnyAgentTool {
  return {
    label: "SpecKit",
    name: "speckit",
    description:
      "Run SpecKit commands to initialize specifications. Use init to initialize a new Specify project with SPEC.md and AGENTS.md.",
    parameters: SpeckitSchema,
    execute: async (_toolCallId, args) => {
      const command = args.command as string;
      const directory = args.directory as string | undefined;
      const force = args.force === true;

      let cmd: string;

      switch (command) {
        case "init": {
          const forceFlag = force ? "--force" : "";
          // Create directory if it doesn't exist
          const targetDir = directory || process.cwd();
          const mkdirCmd = `mkdir -p "${targetDir}" && cd "${targetDir}"`;
          // Use --ignore-agent-tools to skip opencode check
          cmd = `${mkdirCmd} && specify init --here --ai opencode --ignore-agent-tools ${forceFlag}`;
          break;
        }
        case "check":
          if (directory) {
            cmd = `cd "${directory}" && specify check`;
          } else {
            cmd = `specify check`;
          }
          break;
        default:
          return jsonResult({
            error: `Unknown speckit command: ${command}`,
            code: "UNKNOWN_COMMAND",
          });
      }

      try {
        const { stdout, stderr } = await execAsync(cmd, {
          timeout: 120000,
          maxBuffer: 10 * 1024 * 1024,
          env: {
            ...process.env,
            PATH: `/root/.opencode/bin:${process.env.PATH}`,
          },
        });

        return jsonResult({
          success: true,
          command,
          stdout: stdout || "(no output)",
          stderr: stderr || "(no errors)",
          workingDirectory: directory || process.cwd(),
        });
      } catch (error) {
        const err = error as { message?: string; stdout?: string; stderr?: string; code?: number };
        return jsonResult({
          success: false,
          command,
          error: err.message || "Unknown error",
          exitCode: err.code,
          stdout: err.stdout || "",
          stderr: err.stderr || "",
          workingDirectory: directory || process.cwd(),
        });
      }
    },
  };
}
