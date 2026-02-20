import type { SkillSelectionContext } from "./types.js";

export class SkillSelector {
  selectSkills(context: SkillSelectionContext): string[] {
    if (context.coding) {
      return ["specification-engine", "opencode-implementer"];
    }

    if (context.riskLevel === "low") {
      return [];
    }

    return [];
  }
}
