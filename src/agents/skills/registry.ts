import type { SkillDefinition, ComposedSkill, ValidationResult, ValidationError } from "./types.js";

export class SkillRegistry {
  private skills = new Map<string, SkillDefinition>();

  registerSkill(skill: SkillDefinition): void {
    this.skills.set(skill.name, skill);
  }

  getSkill(name: string): SkillDefinition | undefined {
    return this.skills.get(name);
  }

  listAvailableSkills(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  overrideSkillVersion(name: string, version: string): boolean {
    const skill = this.skills.get(name);
    if (!skill) {
      this.skills.set(name, {
        name,
        description: `Skill ${name} (auto-registered)`,
        version,
        allowed_tools: [],
        execution_protocol: [],
      });
      return true;
    }
    skill.version = version;
    return true;
  }

  validateSkillSet(skills: string[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    const uniqueSkills = [...new Set(skills)];

    for (const skillName of uniqueSkills) {
      const skill = this.skills.get(skillName);
      if (!skill) {
        errors.push({
          code: "UNKNOWN_SKILL",
          message: `Skill "${skillName}" not found in registry`,
          skill: skillName,
        });
        continue;
      }

      if (skill.compatibility_rules) {
        for (const rule of skill.compatibility_rules) {
          if (rule.type === "incompatible" && uniqueSkills.includes(rule.skill)) {
            errors.push({
              code: "INCOMPATIBLE_SKILLS",
              message: `Skill "${skillName}" is incompatible with "${rule.skill}": ${rule.reason || ""}`,
              skill: skillName,
            });
          }
        }
      }

      if (skill.composability_rules) {
        for (const rule of skill.composability_rules) {
          if (rule.type === "requires" && !uniqueSkills.includes(rule.skill)) {
            errors.push({
              code: "MISSING_REQUIRED",
              message: `Skill "${skillName}" requires "${rule.skill}": ${rule.reason || ""}`,
              skill: skillName,
            });
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  composeSkills(skills: string[]): ComposedSkill {
    const uniqueSkills = [...new Set(skills)];
    const skillDefs = uniqueSkills
      .map((name) => this.skills.get(name))
      .filter((s): s is SkillDefinition => s !== undefined);

    if (skillDefs.length === 0) {
      return {
        skills: [],
        allowed_tools: [],
        forbidden_tools: [],
        execution_protocol: [],
      };
    }

    const allowedTools = new Set<string>();
    const forbiddenTools = new Set<string>();
    const protocolSet = new Set<string>();

    for (const skill of skillDefs) {
      for (const tool of skill.allowed_tools) {
        allowedTools.add(tool);
      }

      if (skill.forbidden_tools) {
        for (const tool of skill.forbidden_tools) {
          forbiddenTools.add(tool);
          allowedTools.delete(tool);
        }
      }

      for (const step of skill.execution_protocol) {
        protocolSet.add(step);
      }
    }

    return {
      skills: uniqueSkills,
      allowed_tools: Array.from(allowedTools),
      forbidden_tools: Array.from(forbiddenTools),
      execution_protocol: Array.from(protocolSet),
    };
  }
}
