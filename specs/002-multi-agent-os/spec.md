# Feature Specification: 5-Agent AI Collaborative OS

**Feature Branch**: `002-multi-agent-os`  
**Created**: 2026-02-21  
**Status**: Draft  
**Input**: User description: "5-Agent AI Collaborative OS Implementation Plan"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Group Chat Commander Default Response (Priority: P1)

A team member sends a message in a Telegram group chat where the OpenClaw bot is present. Without any @mention, the Commander agent responds by default, coordinating the response.

**Why this priority**: This is the primary entry point for team collaboration. Without this, the system cannot handle unmentioned messages in group chats.

**Independent Test**: Add bot to a group, send a plain message without @mention, verify Commander responds within 30 seconds.

**Acceptance Scenarios**:

1. **Given** the bot is added to a Telegram group with groupPolicy "allowlist", **When** a user sends "What should we build today?", **Then** the Commander agent responds with a strategic overview
2. **Given** the bot is in a group chat, **When** a user sends a message without any @mention, **Then** only the Commander agent responds (no other agents)
3. **Given** the bot is configured with requireMention=true, **When** a message arrives without mention, **Then** the Commander still responds as the default handler

---

### User Story 2 - Specific Agent Invocation via @Mention (Priority: P1)

A team member explicitly @mentions a specific agent (e.g., @engineer) in the group chat. Only that agent responds, demonstrating precise agent routing.

**Why this priority**: This enables direct task delegation to specialized agents without involving the Commander for simple requests.

**Independent Test**: In group chat, send "@engineer how do I implement authentication?" and verify only Engineer responds.

**Acceptance Scenarios**:

1. **Given** all 5 agents are bound to the same Telegram accountId, **When** a user sends "@engineer write a function", **Then** only the Engineer agent responds
2. **Given** mentionPatterns are configured for each agent, **When** a user sends "@strategist analyze this market", **Then** the Strategist agent responds (not Commander)
3. **Given** multiple @mentions in one message, **When** a user sends "@commander @engineer help me", **Then** the first mentioned agent (Commander) responds

---

### User Story 3 - Agent-to-Agent Delegation (Priority: P1)

The Commander delegates a task to another agent by including that agent's @mention in the response. The delegated agent then takes over the conversation.

**Why this priority**: This enables the collaborative workflow where agents pass work to each other based on specialization.

**Independent Test**: Have Commander respond with "@engineer please implement the API", verify Engineer takes over.

**Acceptance Scenarios**:

1. **Given** Commander is responding to a user request, **When** Commander includes "@engineer" in the response, **Then** Engineer agent becomes the active responder
2. **Given** Engineer completes their task, **When** Engineer includes "@commander" to hand back control, **Then** Commander resumes coordination
3. **Given** pingPongLimit is set to 0, **When** agents exchange mentions, **Then** no infinite loop occurs (controlled handoff only)

---

### User Story 4 - DM Session Isolation (Priority: P1)

A team member sends a direct message to the Telegram bot. The DM session is isolated from group chats, maintaining separate context per user.

**Why this priority**: DM conversations may be private or personal and must not leak into group contexts or mix with other users' sessions.

**Independent Test**: Send DM to bot, then add bot to group. Verify DM context does not appear in group and vice versa.

**Acceptance Scenarios**:

1. **Given** session.dmScope is set to "per-account-channel-peer", **When** User A sends a DM to the bot, **Then** the conversation is isolated to User A's session
2. **Given** a user has an active DM session, **When** the same user messages in a group, **Then** group context is separate from DM context
3. **Given** multiple users send DMs, **When** each user messages the bot directly, **Then** each maintains independent session context

---

### User Story 5 - Workspace Memory Persistence (Priority: P2)

Each agent maintains its own workspace with memory files. Short-term logs (YYYY-MM-DD.md) track daily activities, while MEMORY.md preserves long-term preferences and context.

**Why this priority**: Agents need persistent context across sessions to maintain team knowledge and user preferences over time.

**Independent Test**: Have Engineer write a note to memory, restart the system, verify Engineer reads the note on next invocation.

**Acceptance Scenarios**:

1. **Given** each workspace has a memory/ directory, **When** an agent writes to memory/2026-02-21.md, **Then** the file persists and is readable in future sessions
2. **Given** MEMORY.md exists in a workspace, **When** the agent starts, **Then** it loads long-term preferences from MEMORY.md
3. **Given** GROUP_MEMORY.md exists, **When** agents collaborate on group tasks, **Then** they can access shared team information

---

### User Story 6 - Role-Specific Rule Files (Priority: P2)

Each workspace contains standardized rule files (SOUL.md, AGENTS.md, ROLE-COLLAB-RULES.md, TEAM-RULEBOOK.md, TEAM-DIRECTORY.md) that define agent behavior and collaboration boundaries.

**Why this priority**: Agents need clear operational guidelines to understand their role, boundaries, and how to collaborate with other agents.

**Independent Test**: Verify each workspace has all 5 rule files with appropriate content for that role.

**Acceptance Scenarios**:

1. **Given** 5 workspaces exist (commander, strategist, engineer, creator, planner), **When** listing files in each workspace, **Then** all 5 rule files are present
2. **Given** TEAM-DIRECTORY.md exists, **When** an agent needs to invoke another, **Then** it can look up the correct @mention pattern
3. **Given** TEAM-RULEBOOK.md exists, **When** agents collaborate, **Then** they follow the unified collaboration rules

---

### Edge Cases

- What happens when a user @mentions a non-existent agent?
- How does the system handle messages with multiple conflicting @mentions?
- What occurs when the Telegram bot loses connectivity?
- How are conversations archived when memory exceeds size limits?
- What happens if an agent's workspace files are corrupted?
- How does the system handle rate limiting from Telegram API?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST route messages to the Commander agent by default when no @mention is present in group chats
- **FR-002**: System MUST route messages to specific agents when their @mention pattern is detected in the message text
- **FR-003**: System MUST maintain isolated session context for each user in DMs (dmScope: "per-account-channel-peer")
- **FR-004**: System MUST create 5 isolated workspaces at ~/.openclaw/workspaces/{commander,strategist,engineer,creator,planner}/
- **FR-005**: System MUST prevent infinite agent-to-agent loops by setting pingPongLimit to 0
- **FR-006**: Each workspace MUST contain: SOUL.md, AGENTS.md, ROLE-COLLAB-RULES.md, TEAM-RULEBOOK.md, TEAM-DIRECTORY.md
- **FR-007**: Each workspace MUST have memory structure: memory/YYYY-MM-DD.md, MEMORY.md, GROUP_MEMORY.md, memory/archive/
- **FR-008**: System MUST validate gateway configuration JSON syntax using OpenClaw's config validator
- **FR-009**: Team members MUST be able to invoke any agent by text @mention (e.g., @commander, @engineer)
- **FR-010**: Agents MUST be able to delegate to other agents by including @mention in their response
- **FR-011**: System MUST allow configuration of which AI model each agent uses (e.g., GPT-4 for Commander, Claude for Engineer)

### Key Entities _(include if feature involves data)_

- **Agent**: One of 5 roles (Commander, Strategist, Engineer, Creator, Planner) with distinct responsibilities, @mention patterns, and configurable AI model
- **Workspace**: Isolated directory per agent containing rule files and memory
- **Gateway Configuration**: JSON file at ~/.openclaw/openclaw.json controlling routing, session isolation, and channel bindings
- **Mention Pattern**: Text pattern (e.g., @engineer) used to route messages to specific agents
- **Session**: Isolated conversation context per user/channel combination
- **Memory File**: Structured files (daily logs, long-term memory, group memory) for context persistence

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can send a message in a group chat and receive a Commander response within 30 seconds
- **SC-002**: @mention routing correctly invokes the intended agent with 100% accuracy (tested with all 5 agents)
- **SC-003**: DM sessions remain completely isolated from group sessions - no context leakage between them
- **SC-004**: All 5 workspaces are created with complete file structures within 60 seconds of configuration
- **SC-005**: Agent-to-agent delegation works without infinite loops (ping-pong prevention verified)
- **SC-006**: Gateway configuration passes validation with zero errors via OpenClaw doctor
- **SC-007**: Memory files persist across system restarts and are correctly loaded by agents

---

## Assumptions

- Telegram Bot Token will be provided by the user (or placeholder used for initial setup)
- The OpenClaw gateway is already installed and functional
- Users have basic understanding of @mention syntax

## Clarifications

### Session 2026-02-21

- Q: Discord Support Scope → A: Telegram only (remove Discord from scope)
- Q: Non-Existent Agent Mention Handling → A: Ignore the message (no response)
- Q: DM Session Privacy & Security → A: Ephemeral (session-only, no persistent storage)
- Q: Multiple Conflicting Mentions → A: First mentioned agent only
- Q: Model Configuration Format → A: provider/model (e.g., openai:gpt-4, anthropic:claude-3)
