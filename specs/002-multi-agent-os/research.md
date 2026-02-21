# Research: 5-Agent AI Collaborative OS

**Feature**: 002-multi-agent-os | **Date**: 2026-02-21

## Research Questions

### 1. OpenClaw Gateway Configuration Format

**Question**: What is the correct JSON schema for ~/.openclaw/openclaw.json to configure:

- Session isolation (dmScope)
- Telegram channel with groupPolicy
- Agent bindings with mentionPatterns
- requireMention settings
- pingPongLimit

**Finding**: Based on the feature description:

- Session: `{ dmScope: "per-account-channel-peer" }`
- Telegram channel: `{ groupPolicy: "allowlist" }`
- All 5 agents bound to same Telegram accountId
- mentionPatterns for each agent (@commander, @strategist, @engineer, @creator, @planner)
- requireMention: true for all agents
- pingPongLimit: 0

**Decision**: Create configuration template with placeholders for Telegram Bot Token

### 2. Workspace Directory Structure

**Question**: What is the expected structure for agent workspaces in OpenClaw?

**Finding**: Based on feature requirements, each workspace needs:

- SOUL.md - Role definition, tone
- AGENTS.md - Operational manual
- ROLE-COLLAB-RULES.md - Role-specific boundaries
- TEAM-RULEBOOK.md - Unified hard rules
- TEAM-DIRECTORY.md - Role mapping
- MEMORY.md - Long-term profile
- GROUP_MEMORY.md - Shared group info
- memory/YYYY-MM-DD.md - Daily logs
- memory/archive/ - Cold storage

**Decision**: Create template directory structure with placeholder content

### 3. Agent Routing via mentionPatterns

**Question**: How does OpenClaw route messages based on mention patterns?

**Finding**:

- OpenClaw scans incoming message text for mentionPatterns
- When match found, routes to the bound agent
- Default (no mention) routes to Commander
- requireMention ensures explicit invocation

**Decision**: Configuration-driven, no code changes needed

### 4. Per-Agent Model Configuration

**Question**: How should users configure which AI model each agent uses?

**Finding**:

- Model configuration format: `provider/model` (e.g., `openai:gpt-4`, `anthropic:claude-3`)
- Each agent can have a different model
- Models must be configured in the OpenClaw gateway

**Decision**: Add model field to agent configuration in openclaw.json

## Alternatives Considered

### Alternative 1: Multiple Telegram Bots

- Bind each agent to a separate Telegram bot
- **Rejected**: User explicitly requested single bot architecture

### Alternative 2: Discord-First

- Implement Discord first, then Telegram
- **Rejected**: Clarification Q1 chose Telegram-only scope

### Alternative 3: Code-Based Implementation

- Create custom routing logic
- **Rejected**: Feature leverages existing OpenClaw capabilities

## Summary

This is a configuration-driven feature. No code implementation required. Research confirms:

1. OpenClaw supports the required configuration options
2. Workspace structure is custom (created as part of this feature)
3. Agent routing via mentionPatterns is an existing capability
