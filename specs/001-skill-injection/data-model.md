# Data Model: Skill Injection System

**Generated**: 2026-02-19

## Entities

### SkillDefinition

The atomic unit of sub-agent capability definition.

| Field                 | Type                  | Required | Description                                              |
| --------------------- | --------------------- | -------- | -------------------------------------------------------- |
| `name`                | `string`              | Yes      | Unique skill identifier (e.g., `"specification-engine"`) |
| `description`         | `string`              | Yes      | Human-readable description                               |
| `version`             | `string`              | No       | Semantic version (e.g., `"1.0.0"`)                       |
| `allowed_tools`       | `string[]`            | Yes      | List of tool names this skill permits                    |
| `forbidden_tools`     | `string[]`            | No       | List of tool names this skill forbids                    |
| `execution_protocol`  | `string[]`            | Yes      | Ordered list of execution steps                          |
| `preconditions`       | `string[]`            | No       | Conditions that must be met before skill runs            |
| `postconditions`      | `string[]`            | No       | Conditions guaranteed after skill completes              |
| `output_contract`     | `OutputContract`      | No       | Schema for skill output                                  |
| `compatibility_rules` | `CompatibilityRule[]` | No       | Rules defining skill compatibility                       |
| `composability_rules` | `ComposabilityRule[]` | No       | Rules defining how this skill combines with others       |

### OutputContract

Describes the expected output of a skill.

| Field    | Type     | Required | Description            |
| -------- | -------- | -------- | ---------------------- |
| `type`   | `string` | Yes      | Output type identifier |
| `schema` | `object` | No       | JSON schema for output |

### CompatibilityRule

Defines which other skills this skill can/cannot work with.

| Field    | Type                           | Required | Description                |
| -------- | ------------------------------ | -------- | -------------------------- |
| `type`   | `"requires" \| "incompatible"` | Yes      | Rule type                  |
| `skill`  | `string`                       | Yes      | Target skill name          |
| `reason` | `string`                       | No       | Human-readable explanation |

### ComposabilityRule

Defines how this skill behaves when combined with others.

| Field    | Type                      | Required | Description                |
| -------- | ------------------------- | -------- | -------------------------- |
| `type`   | `"requires" \| "forbids"` | Yes      | Rule type                  |
| `skill`  | `string`                  | Yes      | Target skill name          |
| `reason` | `string`                  | No       | Human-readable explanation |

---

### ComposedSkill

Runtime construct representing the effective permissions from multiple skills.

| Field                | Type       | Required | Description                                        |
| -------------------- | ---------- | -------- | -------------------------------------------------- |
| `skills`             | `string[]` | Yes      | List of skill names that were composed             |
| `allowed_tools`      | `string[]` | Yes      | Effective allowed tools (intersection - forbidden) |
| `forbidden_tools`    | `string[]` | Yes      | All forbidden tools from any skill                 |
| `execution_protocol` | `string[]` | Yes      | Ordered union of all protocols                     |

---

### ValidationResult

Output of skill set validation.

| Field      | Type                | Required | Description                    |
| ---------- | ------------------- | -------- | ------------------------------ |
| `valid`    | `boolean`           | Yes      | Whether the skill set is valid |
| `errors`   | `ValidationError[]` | Yes      | List of blocking errors        |
| `warnings` | `string[]`          | Yes      | Non-blocking warnings          |

### ValidationError

Structured error from validation.

| Field     | Type     | Required | Description                          |
| --------- | -------- | -------- | ------------------------------------ |
| `code`    | `string` | Yes      | Error code (e.g., `"UNKNOWN_SKILL"`) |
| `message` | `string` | Yes      | Human-readable message               |
| `skill`   | `string` | No       | Related skill name                   |

---

### SubagentSpawnRequest

Extended spawn request with skills.

| Field      | Type       | Required | Description                 |
| ---------- | ---------- | -------- | --------------------------- |
| `task`     | `string`   | Yes      | Task description            |
| `skills`   | `string[]` | No       | Skills to inject (optional) |
| `label`    | `string`   | No       | Agent label                 |
| `model`    | `string`   | No       | Model override              |
| `thinking` | `string`   | No       | Thinking level              |
| ...        | ...        | ...      | Other spawn params          |

---

## Relationships

```
SkillRegistry
  ├── SkillDefinition (1..*)
  │     ├── allowed_tools (1..*)
  │     ├── forbidden_tools (0..*)
  │     ├── compatibility_rules (0..*)
  │     └── composability_rules (0..*)
  │
  ├── composeSkills() → ComposedSkill
  │     └── Derived from 2+ SkillDefinitions
  │
  └── validateSkillSet() → ValidationResult
        └── Checks SubagentSpawnRequest.skills

SkillSelector
  └── selectSkills(context) → string[]
        └── Returns list of skill names
```

---

## Validation Rules

| Rule | Description                                                     |
| ---- | --------------------------------------------------------------- |
| V001 | All skill names in spawn request must exist in registry         |
| V002 | If skill A requires skill B, skill B must be present in spawn   |
| V003 | If skill A is incompatible with skill B, both cannot be present |
| V004 | Forbidden tools are NOT allowed (regardless of allowed_tools)   |
| V005 | Empty allowed_tools is valid (zero-capability skill)            |
| V006 | Duplicate skill names in spawn are deduplicated                 |

---

## State Transitions

```
[No Skills] --(spawn without skills)--> [Default Behavior]

[Skill Set Requested]
         |
         v
    [Validation]
         |
    +----+----+
    |         |
[Valid]    [Invalid]
    |         |
    v         v
[Compose]  [Reject with ValidationError]
    |
    v
[Sub-agent spawned with constraints]
```

---

## Example Data

### Built-in Coding Skills

**specification-engine**

```json
{
  "name": "specification-engine",
  "description": "Generates specifications for implementation tasks",
  "allowed_tools": ["specKit"],
  "execution_protocol": ["analyze-task", "generate-spec", "validate-spec"],
  "composability_rules": [
    {
      "type": "requires",
      "skill": "opencode-implementer",
      "reason": "Spec must be followed by implementation"
    }
  ]
}
```

**opencode-implementer**

```json
{
  "name": "opencode-implementer",
  "description": "Executes code implementation based on specifications",
  "allowed_tools": ["opencode-executor"],
  "forbidden_tools": ["write", "edit"],
  "execution_protocol": ["read-spec", "implement", "verify"],
  "composability_rules": [
    {
      "type": "requires",
      "skill": "specification-engine",
      "reason": "Implementation requires a spec"
    }
  ]
}
```

### Composition Example

**Input**: `["specification-engine", "opencode-implementer"]`

**ComposedSkill**:

```json
{
  "skills": ["specification-engine", "opencode-implementer"],
  "allowed_tools": ["specKit", "opencode-executor"],
  "forbidden_tools": ["write", "edit"],
  "execution_protocol": [
    "analyze-task",
    "generate-spec",
    "validate-spec",
    "read-spec",
    "implement",
    "verify"
  ]
}
```
