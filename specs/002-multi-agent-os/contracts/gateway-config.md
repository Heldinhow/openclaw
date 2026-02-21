# Gateway Configuration Contract

**File**: `~/.openclaw/openclaw.json`

## Actual OpenClaw Schema (not the contract schema)

**IMPORTANT**: This contract was corrected to match the actual OpenClaw config schema discovered via code research.

```json
{
  "session": {
    "dmScope": "per-account-channel-peer"
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "groupPolicy": "allowlist",
      "groups": {
        "*": {
          "requireMention": false
        }
      }
    }
  },
  "agents": {
    "list": [
      {
        "id": "commander",
        "identity": {
          "name": "Commander",
          "emoji": "🎯"
        },
        "model": {
          "primary": "minimax-portal/MiniMax-M2.5"
        },
        "groupChat": {
          "mentionPatterns": ["@commander"]
        },
        "default": true
      },
      {
        "id": "strategist",
        "identity": {
          "name": "Strategist",
          "emoji": "🧠"
        },
        "model": {
          "primary": "minimax-portal/MiniMax-M2.5"
        },
        "groupChat": {
          "mentionPatterns": ["@strategist"]
        }
      },
      {
        "id": "engineer",
        "identity": {
          "name": "Engineer",
          "emoji": "🔧"
        },
        "model": {
          "primary": "minimax-portal/MiniMax-M2.1"
        },
        "groupChat": {
          "mentionPatterns": ["@engineer"]
        }
      },
      {
        "id": "creator",
        "identity": {
          "name": "Creator",
          "emoji": "🎨"
        },
        "model": {
          "primary": "minimax-portal/MiniMax-M2.5"
        },
        "groupChat": {
          "mentionPatterns": ["@creator"]
        }
      },
      {
        "id": "planner",
        "identity": {
          "name": "Planner",
          "emoji": "📋"
        },
        "model": {
          "primary": "minimax-portal/MiniMax-M2.1-lightning"
        },
        "groupChat": {
          "mentionPatterns": ["@planner"]
        }
      }
    ]
  }
}
```

## Key Schema Differences from Original Contract

| Contract (Wrong)               | Actual OpenClaw Schema                      |
| ------------------------------ | ------------------------------------------- |
| `channels` (array)             | `channels.telegram` (object)                |
| `agents` (array)               | `agents.list` (array)                       |
| `name` (root level)            | `identity.name`                             |
| `mentionPattern` (string)      | `groupChat.mentionPatterns` (array)         |
| `requireMention` (agent level) | `channels.telegram.groups.*.requireMention` |
| `channel`                      | Not needed (uses Telegram by default)       |
| `model` (string)               | `model.primary` (string)                    |

## Validation

Validate configuration with:

```bash
openclaw doctor
```
