import fs from "node:fs";
import path from "node:path";
import { resolveUserPath } from "../../utils.js";
import type { SkillEntry } from "./types.js";
import { loadWorkspaceSkillEntries } from "./workspace.js";

const fsp = fs.promises;

/**
 * Load skill content (SKILL.md) by skill name or path
 */
export async function loadSkillContentForSubagent(
  skillNames: string[],
  workspaceDir: string,
): Promise<string> {
  if (!skillNames || skillNames.length === 0) {
    return "";
  }

  const entries = loadWorkspaceSkillEntries(workspaceDir);
  const lines: string[] = [];

  for (const skillName of skillNames) {
    const trimmed = skillName.trim();
    if (!trimmed) continue;

    // Find skill by name or path
    const entry = entries.find((e: SkillEntry) => {
      const skillNameFromEntry = e.skill.name?.toLowerCase();
      const skillBaseDir = e.skill.baseDir;
      return (
        skillNameFromEntry === trimmed.toLowerCase() ||
        skillBaseDir?.endsWith(trimmed) ||
        skillBaseDir?.endsWith(`/${trimmed}`) ||
        path.basename(skillBaseDir || "") === trimmed
      );
    });

    if (entry) {
      const skillPath = entry.skill.baseDir;
      if (skillPath) {
        try {
          const skillMdPath = path.join(skillPath, "SKILL.md");
          const stat = await fsp.stat(skillMdPath);

          // Skip if too large (> 50KB)
          if (stat.size > 50 * 1024) {
            lines.push(`### ${entry.skill.name}`);
            lines.push(`(Skill content too large, ${Math.round(stat.size / 1024)}KB)`);
            continue;
          }

          const content = await fsp.readFile(skillMdPath, "utf-8");
          lines.push(`### ${entry.skill.name}`);
          lines.push("");
          lines.push(content.trim());
          lines.push("");
        } catch (err) {
          lines.push(`### ${entry.skill.name}`);
          lines.push(`(Could not load skill content: ${err})`);
        }
      }
    } else {
      // Try as direct path
      try {
        const resolvedPath = resolveUserPath(trimmed);
        const skillMdPath = path.join(resolvedPath, "SKILL.md");
        const stat = await fsp.stat(skillMdPath);

        if (stat.size > 50 * 1024) {
          lines.push(`### ${path.basename(trimmed)}`);
          lines.push(`(Skill content too large, ${Math.round(stat.size / 1024)}KB)`);
          continue;
        }

        const content = await fsp.readFile(skillMdPath, "utf-8");
        lines.push(`### ${path.basename(trimmed)}`);
        lines.push("");
        lines.push(content.trim());
        lines.push("");
      } catch {
        lines.push(`### ${trimmed}`);
        lines.push(`(Skill not found)`);
      }
    }
  }

  return lines.join("\n");
}

/**
 * Load file contents for sub-agent context
 */
export async function loadFilesForSubagent(
  filePaths: string[],
  maxFileSizeKB: number = 100,
): Promise<string> {
  if (!filePaths || filePaths.length === 0) {
    return "";
  }

  const lines: string[] = [];

  for (const filePath of filePaths) {
    const trimmed = filePath.trim();
    if (!trimmed) continue;

    try {
      const resolvedPath = resolveUserPath(trimmed);
      const stat = await fsp.stat(resolvedPath);

      if (stat.isDirectory()) {
        lines.push(`## ${path.basename(trimmed)}/`);
        lines.push("(Is a directory, skipping)");
        lines.push("");
        continue;
      }

      if (stat.size > maxFileSizeKB * 1024) {
        const ext = path.extname(trimmed);
        lines.push(`## ${path.basename(trimmed)}`);
        lines.push("```" + ext);
        lines.push(
          `[File too large: ${Math.round(stat.size / 1024)}KB, truncated to ${maxFileSizeKB}KB]`,
        );
        lines.push("```");
        lines.push("");
        continue;
      }

      const content = await fsp.readFile(resolvedPath, "utf-8");
      const ext = path.extname(trimmed);
      const language = getLanguageFromExt(ext);

      lines.push(`## ${path.basename(trimmed)}`);
      lines.push(`Path: \`${trimmed}\``);
      lines.push("");

      if (ext && language) {
        lines.push("```" + language);
        lines.push(content);
        lines.push("```");
      } else {
        lines.push("```");
        lines.push(content);
        lines.push("```");
      }
      lines.push("");
    } catch (err) {
      lines.push(`## ${path.basename(trimmed)}`);
      lines.push(`(Could not read file: ${err})`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Map file extension to language for code highlighting
 */
function getLanguageFromExt(ext: string): string {
  const map: Record<string, string> = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".py": "python",
    ".rb": "ruby",
    ".go": "go",
    ".rs": "rust",
    ".java": "java",
    ".kt": "kotlin",
    ".swift": "swift",
    ".c": "c",
    ".cpp": "cpp",
    ".h": "c",
    ".hpp": "cpp",
    ".cs": "csharp",
    ".php": "php",
    ".sh": "bash",
    ".bash": "bash",
    ".zsh": "bash",
    ".sql": "sql",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".xml": "xml",
    ".html": "html",
    ".css": "css",
    ".scss": "scss",
    ".md": "markdown",
    ".txt": "text",
  };
  return map[ext.toLowerCase()] || "";
}
