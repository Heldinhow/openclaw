# Workspace Contract

**Directory**: `~/.openclaw/workspaces/{agent-id}/`

## Required Files

| File                 | Required | Description                                        |
| -------------------- | -------- | -------------------------------------------------- |
| SOUL.md              | Yes      | Role definition, tone, DM vs Group Mode strategies |
| AGENTS.md            | Yes      | Operational manual, collaboration processes        |
| ROLE-COLLAB-RULES.md | Yes      | Role-specific boundaries                           |
| TEAM-RULEBOOK.md     | Yes      | Unified hard rules, mention formulas               |
| TEAM-DIRECTORY.md    | Yes      | Role mapping to responsibilities                   |
| MEMORY.md            | Yes      | Long-term profile/preferences                      |
| GROUP_MEMORY.md      | Yes      | Reusable group info (isolated from DMs)            |
| memory/YYYY-MM-DD.md | Auto     | Daily short-term logs                              |
| memory/archive/      | Yes      | Cold storage directory                             |

## File Templates

### SOUL.md

```markdown
# Agent SOUL: [Role Name]

## Core Identity

- Role: [commander|strategist|engineer|creator|planner]
- Primary Function: [what this agent does]

## Tone & Voice

- Formal/Informal: [...]
- Technical Level: [...]
- Response Style: [...]

## Modes

### DM Mode

[How to behave in direct messages]

### Group Mode

[How to behave in group chats]
```

### TEAM-DIRECTORY.md

```markdown
# Team Directory

## Roles

| Role       | @Mention    | Primary Responsibility   |
| ---------- | ----------- | ------------------------ |
| Commander  | @commander  | Coordination, final say  |
| Strategist | @strategist | Planning, analysis       |
| Engineer   | @engineer   | Technical implementation |
| Creator    | @creator    | Content, design          |
| Planner    | @planner    | Scheduling, roadmapping  |

## Invocation

- To invoke: Use @mention pattern
- Example: "@engineer write a function"
```
