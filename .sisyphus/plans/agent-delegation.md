# Agent-to-Agent Delegation Implementation Plan

## Overview

Enable Commander to automatically delegate tasks to other main agents (planner, engineer, strategist, creator) by detecting when another agent's expertise is needed and sending the task to their session via `sessions_send`.

## TL;DR

> **Quick Summary**: Commander receives user messages, analyzes them for delegation opportunities, and uses `sessions_send` to delegate tasks to other agents' sessions. Results flow back through Commander to the user.

> **Deliverables**:
>
> - Updated Commander workspace with delegation detection logic
> - Delegation pattern matching in Commander's system prompt
> - Agent capability mapping for task routing

> **Estimated Effort**: Short
> **Parallel Execution**: N/A (sequential)
> **Critical Path**: Update Commander → Test delegation

---

## Context

### User Requirements

- **Delegation Model**: Route to existing agent sessions (Commander delegates to existing sessions)
- **Session Scope**: Isolated - each delegation is fresh context
- **Result Flow**: Commander as middleman (Planner → Commander → User)
- **Trigger**: Automatic detection by Commander

### Current State

- `@mention` routing implemented (`resolveAgentMention()`)
- 5 agents configured with workspaces (commander, strategist, engineer, creator, planner)
- `sessions_send` tool available for inter-session messaging
- Agent-to-agent config available via `tools.agentToAgent.enabled`

### Key Findings

1. **Session Key Structure**:
   - Main agent: `agent:{agentId}:telegram:dm:{accountId}` or `agent:{agentId}:telegram:group:{groupId}`
   - Subagent: `agent:{agentId}:subagent:{subagentId}:...`

2. **sessions_send Tool**:
   - Accepts `sessionKey`, `label`, or `agentId` to target sessions
   - Requires `tools.agentToAgent.enabled=true` for cross-agent messaging
   - Supports `timeoutSeconds` for waiting on response

3. **Session Resolution**:
   - `buildAgentPeerSessionKey()` builds session keys for agents
   - Commander's session key available in context

---

## Work Objectives

### Core Objective

Commander automatically delegates tasks to specialized agents when their expertise is needed, using `sessions_send` to deliver tasks and receive results.

### Concrete Deliverables

1. Updated `workspaces/commander/AGENTS.md` with delegation logic
2. Updated `workspaces/commander/SOUL.md` with delegation capabilities
3. Delegation detection patterns in Commander's system prompt

### Definition of Done

- [ ] Commander can detect when delegation is needed based on message content
- [ ] Commander can determine target agent based on task type
- [ ] Commander can send task to target agent via sessions_send
- [ ] Commander receives and delivers result to user

### Must Have

- Automatic detection (no @mention required)
- All 4 agents (planner, engineer, strategist, creator) delegable
- Results flow through Commander

### Must NOT Have

- Circular delegation loops
- Full conversation history passed to delegated agents (security/performance)

---

## Execution Strategy

### Task Breakdown

**Task 1: Update Commander AGENTS.md with Delegation Logic**

Update `workspaces/commander/AGENTS.md` with detailed delegation instructions:

- Delegation detection patterns (what tasks need which agents)
- How to use sessions_send
- Result formatting

**Task 2: Update Commander SOUL.md with Delegation Capabilities**

Add delegation capabilities to Commander's identity:

- When to delegate
- How to determine target agent
- Result aggregation

**Task 3: Verify Agent-to-Agent Configuration**

Ensure `tools.agentToAgent.enabled=true` in config (may already be set)

---

## TODOs

- [x] 1. Update Commander AGENTS.md with delegation detection patterns

  **What to do**:
  - Add delegation detection logic to Commander's operational manual
  - Include task-to-agent mapping patterns
  - Document sessions_send usage

  **Acceptance Criteria**:
  - [x] AGENTS.md contains delegation detection patterns
  - [x] Patterns cover all 4 target agents (planner, engineer, strategist, creator)
  - [x] Usage of sessions_send documented

- [x] 2. Update Commander SOUL.md with delegation capabilities

  **What to do**:
  - Add delegation to Commander's responsibilities
  - Include agent capability mapping
  - Document result flow

  **Acceptance Criteria**:
  - [x] SOUL.md mentions delegation capability
  - [x] Lists all 4 agents can be delegated to

- [x] 3. Verify agent-to-agent configuration

  **What to do**:
  - Check ~/.openclaw/openclaw.json for tools.agentToAgent.enabled
  - Enable if not already enabled

  **Acceptance Criteria**:
  - [x] agentToAgent enabled in config (added default true in schema)

---

## Verification Strategy

### Test Scenarios

**Scenario 1: Engineer Delegation**

- User: "how do I implement authentication?"
- Commander detects: technical implementation task
- Commander delegates to @engineer via sessions_send
- Engineer responds with implementation guidance
- Commander delivers result to user

**Scenario 2: Planner Delegation**

- User: "create a schedule for our project"
- Commander detects: scheduling/planning task
- Commander delegates to @planner
- Planner creates schedule
- Commander delivers to user

**Scenario 3: Strategist Delegation**

- User: "analyze our market position"
- Commander detects: analysis task
- Commander delegates to @strategist
- Strategist provides analysis
- Commander delivers to user

---

## Configuration Check

Ensure `~/.openclaw/openclaw.json` has:

```json
{
  "tools": {
    "agentToAgent": {
      "enabled": true
    }
  }
}
```

---

## Success Criteria

1. Commander automatically detects when delegation is needed
2. Commander can delegate to all 4 agents (planner, engineer, strategist, creator)
3. Results flow back through Commander to user
4. Each delegation is isolated (fresh context)
