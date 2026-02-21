# Quickstart: 5-Agent AI Collaborative OS

**Feature**: 002-multi-agent-os | **Date**: 2026-02-21

## Prerequisites

1. OpenClaw gateway installed and running
2. Telegram Bot Token (get from @BotFather on Telegram)
3. Access to ~/.openclaw/ directory

## Setup Steps

### Step 1: Create Gateway Configuration

Create `~/.openclaw/openclaw.json`:

```json
{
  "session": {
    "dmScope": "per-account-channel-peer"
  },
  "channels": [
    {
      "type": "telegram",
      "groupPolicy": "allowlist",
      "accountId": "YOUR_TELEGRAM_BOT_TOKEN"
    }
  ],
  "agents": [
    {
      "id": "commander",
      "name": "Commander",
      "channel": "telegram",
      "mentionPattern": "@commander",
      "requireMention": false,
      "pingPongLimit": 0,
      "model": "openai:gpt-4"
    },
    {
      "id": "strategist",
      "name": "Strategist",
      "channel": "telegram",
      "mentionPattern": "@strategist",
      "requireMention": true,
      "pingPongLimit": 0,
      "model": "anthropic:claude-3-opus"
    },
    {
      "id": "engineer",
      "name": "Engineer",
      "channel": "telegram",
      "mentionPattern": "@engineer",
      "requireMention": true,
      "pingPongLimit": 0,
      "model": "openai:gpt-4"
    },
    {
      "id": "creator",
      "name": "Creator",
      "channel": "telegram",
      "mentionPattern": "@creator",
      "requireMention": true,
      "pingPongLimit": 0,
      "model": "anthropic:claude-3-sonnet"
    },
    {
      "id": "planner",
      "name": "Planner",
      "channel": "telegram",
      "mentionPattern": "@planner",
      "requireMention": true,
      "pingPongLimit": 0,
      "model": "openai:gpt-4"
    }
  ]
}
```

### Step 2: Create Workspace Directories

```bash
mkdir -p ~/.openclaw/workspaces/{commander,strategist,engineer,creator,planner}/memory/archive
```

### Step 3: Create Rule Files

Each workspace needs:

- SOUL.md - Role definition
- AGENTS.md - Operational manual
- ROLE-COLLAB-RULES.md - Role boundaries
- TEAM-RULEBOOK.md - Team rules
- TEAM-DIRECTORY.md - Role mapping
- MEMORY.md - Long-term memory
- GROUP_MEMORY.md - Group info

### Step 4: Validate Configuration

```bash
openclaw doctor
```

### Step 5: Test in Telegram

1. Add bot to group
2. Send message without @mention → Commander responds
3. Send "@engineer help" → Engineer responds
4. Test agent-to-agent delegation

## Verification

| Test                   | Expected Result                      |
| ---------------------- | ------------------------------------ |
| Plain message in group | Commander responds                   |
| @engineer mention      | Engineer responds                    |
| @commander @engineer   | First mentioned (Commander) responds |
| DM to bot              | Isolated session                     |
| @commander @strategist | First mentioned responds             |
