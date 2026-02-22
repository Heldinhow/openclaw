---
name: openclawing
description: Use when working on the OpenClaw multi-channel AI gateway codebase - includes CLI, messaging channels, agent integration, and plugin development patterns.
---

# OpenClaw Agent Skill

## Overview

**OpenClaw** is a multi-channel AI gateway with extensible messaging integrations. It connects AI agents to Telegram, Discord, Slack, Signal, iMessage, WhatsApp, and other messaging platforms.

This skill provides essential context for working effectively on the OpenClaw codebase.

## Project Structure

```
openclaw/
├── src/                      # Main source code
│   ├── cli/                  # CLI wiring and commands
│   ├── commands/             # Command implementations
│   ├── telegram/             # Telegram bot implementation
│   ├── discord/              # Discord bot implementation
│   ├── slack/                # Slack bot implementation
│   ├── signal/               # Signal messenger
│   ├── imessage/             # iMessage via Mac
│   ├── web/                  # WhatsApp Web (baileys)
│   ├── agents/               # AI agent integration (Pi)
│   ├── gateway/              # Gateway server
│   ├── config/               # Configuration management
│   ├── plugins/              # Built-in plugins
│   ├── hooks/                # Lifecycle hooks
│   ├── sessions/             # Session management
│   └── routing/              # Message routing
├── extensions/               # Plugin extensions (workspace packages)
│   ├── telegram/             # Extended Telegram features
│   ├── whatsapp/             # WhatsApp extension
│   ├── matrix/               # Matrix protocol
│   ├── msteams/              # Microsoft Teams
│   └── voice-call/           # Voice call handling
├── apps/                     # Mobile/desktop apps
│   ├── macos/                # macOS app (SwiftUI)
│   ├── ios/                  # iOS app
│   └── android/              # Android app
├── docs/                     # Mintlify documentation
└── .agents/skills/           # Agent skills (mintlify, PR_WORKFLOW, etc.)
```

## Key Technologies

- **Runtime**: Node.js 22+ (ESM modules)
- **Language**: TypeScript with strict typing
- **Testing**: Vitest with V8 coverage thresholds (70%)
- **Linting**: Oxlint + Oxfmt
- **Build**: tsdown for bundling
- **AI**: Pi agent core (@mariozechner/pi-agent-core)

## CLI Commands

The CLI uses Commander.js. Main commands are registered in `src/cli/program/command-registry.ts`.

### Common Commands

```bash
pnpm start                    # Start the gateway
pnpm dev                      # Run in development mode
pnpm openclaw <command>       # Run CLI commands
pnpm build                    # Build TypeScript
pnpm check                    # Lint + format + typecheck
pnpm test                     # Run tests
pnpm test:coverage            # Run with coverage
pnpm test:live                # Live tests (real API keys)
pnpm format                   # Auto-format code
pnpm format:fix              # Fix formatting
```

### CLI Entry Points

- `src/entry.ts` - Initial entry, handles respawn for experimental warnings
- `src/index.ts` - Main CLI with Commander.js
- `src/cli/program/build-program.ts` - Program builder
- `src/cli/program/command-registry.ts` - Command registration

### Adding New Commands

1. Create command file in `src/cli/program/register.<command>.ts`
2. Add to `coreEntries` array in `command-registry.ts`
3. Use dependency injection via `createDefaultDeps()`

## Channel Implementations

Each messaging channel follows similar patterns:

### Core Channel Pattern

```typescript
// Typical structure
src/<channel>/
├── bot.ts              # Bot initialization
├── bot-handlers.ts     # Message handlers
├── accounts.ts         # Account management
├── send.ts             # Outbound messaging
├── fetch.ts            # Inbound fetching
├── probe.ts            # Health checks
└── formats.ts          # Message formatting
```

### Built-in Channels (src/)

| Channel  | Directory       | Library                 |
| -------- | --------------- | ----------------------- |
| Telegram | `src/telegram/` | grammY                  |
| Discord  | `src/discord/`  | @slack/bolt (adapted)   |
| Slack    | `src/slack/`    | @slack/bolt             |
| Signal   | `src/signal/`   | signal-utils            |
| iMessage | `src/imessage/` | bluebubbles API         |
| WhatsApp | `src/web/`      | @whiskeysockets/baileys |
| LINE     | `src/line/`     | @line/bot-sdk           |

### Extension Channels (extensions/)

Extensions are workspace packages in `extensions/`:

- `extensions/telegram/` - Extended Telegram features
- `extensions/whatsapp/` - WhatsApp via webhook
- `extensions/matrix/` - Matrix protocol
- `extensions/msteams/` - Microsoft Teams
- `extensions/slack/` - Extended Slack
- `extensions/voice-call/` - Voice call handling

## Agent Integration (Pi)

The AI agent integration lives in `src/agents/`:

### Key Files

- `src/agents/pi-embedded-runner.ts` - Main Pi runner
- `src/agents/pi-embedded-subscribe.ts` - Streaming handler
- `src/agents/pi-tools.ts` - Tool definitions
- `src/agents/subagent-registry.ts` - Sub-agent management
- `src/agents/sessions-spawn.ts` - Session spawning

### Agent Flow

1. Message arrives via channel
2. Routed to session (via `sessionKey`)
3. Pi agent processes message
4. Tools execute (bash, files, browser, etc.)
5. Response sent back via channel

### Session Management

- Sessions stored in `~/.openclaw/sessions/`
- Key derivation: `deriveSessionKey()` from config
- Transcript management in `src/sessions/`

## Plugin System

### Plugin SDK

`src/plugin-sdk/` provides interfaces for extensions:

```
src/plugin-sdk/
├── index.ts            # Main exports
├── account.ts          # Account types
├── channel.ts          # Channel interface
├── message.ts          # Message types
└── config.ts           # Config schema
```

### Creating a Plugin

1. Create directory in `extensions/<plugin-name>/`
2. Add `package.json` with:
   - `openclaw` in `peerDependencies` or `devDependencies`
   - Runtime deps in `dependencies`
   - Install runs `npm install --omit=dev` in plugin dir
3. Implement plugin interface
4. Register in gateway

## Configuration

### Config Location

- User config: `~/.openclaw/` (not configurable)
- Credentials: `~/.openclaw/credentials/`
- Sessions: `~/.openclaw/sessions/`

### Config Files

- `src/config/config.ts` - Main config loading
- `src/config/sessions.ts` - Session store
- `src/config/accounts.ts` - Account management

### Environment Variables

- `OPENCLAW_PROFILE` - Configuration profile
- `OPENCLAW_SKIP_CHANNELS=1` - Skip channel initialization
- `CLAWDBOT_LIVE_TEST=1` - Enable live tests

## Testing Conventions

### Test Structure

- Framework: Vitest
- Location: Colocated `*.test.ts`
- E2E: `*.e2e.test.ts`
- Naming: Match source file names

### Running Tests

```bash
pnpm test                      # Unit tests
pnpm test:e2e                  # E2E tests
pnpm test:live                 # Live tests (real APIs)
pnpm test:coverage             # With coverage
pnpm test:docker:live-models   # Docker live tests
```

### Coverage Requirements

- 70% lines/branches/functions/statements
- Run `pnpm test` before pushing

### Test Patterns

```typescript
import { describe, it, expect, vi } from "vitest";

// Use test-helpers from src/test-helpers/
// Mock external dependencies
// Use fake timers where appropriate (debounce, throttle, retries)
```

## Coding Standards

### TypeScript

- **Strict typing**: Never use `any`, `@ts-ignore`, `@ts-expect-error`
- **ESM modules**: Use `import.meta.url`, fileURLToPath
- **Avoid**: Prototype mutation for class behavior

### File Conventions

- Keep files under ~500-700 LOC
- Use dependency injection (`createDefaultDeps`)
- Extract helpers instead of creating "V2" copies

### Formatting

```bash
pnpm check                     # Run all checks
pnpm format                    # Auto-format
pnpm format:fix                # Fix formatting issues
```

### CLI Output

- Use `src/cli/progress.ts` for spinners (`osc-progress` + `@clack/prompts`)
- Use `src/terminal/table.ts` for tables
- Use `src/terminal/palette.ts` for colors (never hardcode)

## Gateway Server

The gateway runs as a menubar app on macOS:

- Port: 18789 (default)
- Mode: `local` or `remote`
- Restart: Via Mac app or `scripts/restart-mac.sh`

### Gateway Endpoints

- `GET /health` - Health check
- `POST /tools/invoke` - Tool invocation
- `WebSocket /ws` - Real-time updates

### Gateway Development

```bash
pnpm gateway:dev               # Dev mode
pnpm gateway:watch             # Watch mode
```

## Common Development Tasks

### Adding a New Channel

1. Create directory in `src/<channel>/`
2. Implement bot, handlers, send, fetch
3. Add to routing in `src/routing/`
4. Update CLI registration
5. Add to docs

### Adding a New Command

1. Create `src/cli/program/register.<name>.ts`
2. Import and add to `coreEntries` in `command-registry.ts`
3. Use `createDefaultDeps()` for DI

### Adding a Plugin

1. Create `extensions/<plugin-name>/`
2. Add `package.json` with peerDependency on `openclaw`
3. Implement plugin interface
4. Test with `pnpm test`

### Debugging Channel Issues

```bash
# Check channel status
openclaw channels status --probe

# View logs (macOS)
./scripts/clawlog.sh

# Restart gateway
pkill -9 -f openclaw-gateway
openclaw gateway run --bind loopback --port 18789 --force
```

## Version Management

### Version Locations

- CLI: `package.json`
- macOS: `apps/macos/Sources/OpenClaw/Resources/Info.plist`
- iOS: `apps/ios/Sources/Info.plist`
- Android: `apps/android/app/build.gradle.kts`

### Release Process

1. Read `docs/reference/RELEASING.md`
2. Update all version locations
3. Run `node --import tsx scripts/release-check.ts`
4. Build: `pnpm build && pnpm mac:package`
5. Test: `pnpm test:install:smoke`

## Important Files Reference

| Purpose            | File                                      |
| ------------------ | ----------------------------------------- |
| CLI entry          | `src/index.ts`, `src/entry.ts`            |
| Program builder    | `src/cli/program/build-program.ts`        |
| Command registry   | `src/cli/program/command-registry.ts`     |
| Config loading     | `src/config/config.ts`                    |
| Session management | `src/sessions/`, `src/config/sessions.ts` |
| Pi runner          | `src/agents/pi-embedded-runner.ts`        |
| Plugin SDK         | `src/plugin-sdk/index.ts`                 |
| Gateway server     | `src/gateway/server.ts`                   |
| Message routing    | `src/routing/`                            |
| Test helpers       | `src/test-helpers/`                       |

## Anti-Patterns to Avoid

- ❌ Using `any` type
- ❌ Adding `@ts-nocheck`
- ❌ Prototype mutation for class sharing
- ❌ Hardcoding colors (use palette)
- ❌ Manual spinners (use progress.ts)
- ❌ Committing without `pnpm check`
- ❌ Skipping tests before push
- ❌ Editing node_modules

## Quick Reference

| Task        | Command/Location                     |
| ----------- | ------------------------------------ |
| Start dev   | `pnpm dev`                           |
| Build       | `pnpm build`                         |
| Test        | `pnpm test`                          |
| Format      | `pnpm format:fix`                    |
| Add channel | `src/<channel>/`                     |
| Add command | `src/cli/program/register.<name>.ts` |
| Add plugin  | `extensions/<name>/`                 |
| Config      | `src/config/`, `~/.openclaw/`        |
| Sessions    | `~/.openclaw/sessions/`              |

## Related Skills

- **superpowers:systematic-debugging** - For bug investigation
- **superpowers:test-driven-development** - For feature development
- **superpowers:verification-before-completion** - For validation before commit
- **superpowers:subagent-driven-development** - For multi-task work
