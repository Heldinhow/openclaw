import type { SkillDefinition } from "../types.js";

export const specificationEngine: SkillDefinition = {
  name: "specification-engine",
  description: "Generates specifications for implementation tasks",
  version: "1.0.0",
  allowed_tools: ["specKit"],
  execution_protocol: ["analyze-task", "generate-spec", "validate-spec"],
  composability_rules: [
    {
      type: "requires",
      skill: "opencode-implementer",
      reason: "Spec must be followed by implementation",
    },
  ],
};

export const opencodeImplementer: SkillDefinition = {
  name: "opencode-implementer",
  description: "Executes code implementation based on specifications",
  version: "1.0.0",
  allowed_tools: ["opencode-executor"],
  forbidden_tools: ["write", "edit"],
  execution_protocol: ["read-spec", "implement", "verify"],
  composability_rules: [
    {
      type: "requires",
      skill: "specification-engine",
      reason: "Implementation requires a spec",
    },
  ],
};

export const codingSkills: SkillDefinition[] = [specificationEngine, opencodeImplementer];
