# Data Model: 5-Agent AI Collaborative OS

**Feature**: 002-multi-agent-os | **Date**: 2026-02-21

## Entities

### Agent

| Field          | Type   | Description                                                           |
| -------------- | ------ | --------------------------------------------------------------------- |
| id             | string | Unique identifier (commander, strategist, engineer, creator, planner) |
| name           | string | Display name                                                          |
| mentionPattern | string | @mention pattern for routing (e.g., @engineer)                        |
| role           | enum   | Role type: commander, strategist, engineer, creator, planner          |
| model          | string | AI model in format "provider/model" (e.g., "openai:gpt-4")            |
| workspacePath  | string | Path to workspace directory                                           |

### Workspace

| Field     | Type    | Description                                            |
| --------- | ------- | ------------------------------------------------------ |
| path      | string  | Absolute path (e.g., ~/.openclaw/workspaces/commander) |
| agentId   | string  | Reference to Agent.id                                  |
| hasMemory | boolean | Whether memory directory exists                        |

### GatewayConfiguration

| Field           | Type   | Description                                        |
| --------------- | ------ | -------------------------------------------------- |
| session.dmScope | string | Session isolation mode: "per-account-channel-peer" |
| channels        | array  | List of configured channels                        |
| agents          | array  | List of agent bindings                             |

### TelegramChannel

| Field         | Type   | Description                          |
| ------------- | ------ | ------------------------------------ |
| type          | string | "telegram"                           |
| groupPolicy   | string | "allowlist" or "blocklist"           |
| accountId     | string | Bot account identifier               |
| agentBindings | array  | List of agents bound to this channel |

### AgentBinding

| Field          | Type    | Description                                                |
| -------------- | ------- | ---------------------------------------------------------- |
| agentId        | string  | Agent identifier                                           |
| mentionPattern | string  | Pattern to match                                           |
| requireMention | boolean | Whether mention is required                                |
| pingPongLimit  | number  | Maximum handoffs (0 = disabled)                            |
| model          | string  | AI model in format "provider/model" (e.g., "openai:gpt-4") |

### MemoryFile

| Field   | Type   | Description                     |
| ------- | ------ | ------------------------------- |
| path    | string | Absolute path to file           |
| type    | enum   | daily, longterm, group, archive |
| content | string | File contents                   |

## Relationships

```
GatewayConfiguration 1--* TelegramChannel
TelegramChannel 1--* AgentBinding
AgentBinding *--1 Agent
Agent 1--1 Workspace
Workspace 1--* MemoryFile
```

## Validation Rules

- Agent IDs must be unique: commander, strategist, engineer, creator, planner
- mentionPatterns must start with "@"
- Workspace paths must be under ~/.openclaw/workspaces/
- pingPongLimit must be >= 0
- groupPolicy must be "allowlist" or "blocklist"
- Model must be in format "provider:model" (e.g., "openai:gpt-4", "anthropic:claude-3")
