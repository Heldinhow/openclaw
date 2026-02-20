GATEWAY_HELPER_PLAN.md

1. Goal and success criteria

Goal

- Implement a Gateway Helper service inside the gateway codebase that reliably waits for a sub-agent run (spawned via parallel_spawn / run APIs) to complete and then extracts the final run transcript/result (session transcript, final status, outputs). The helper must be usable by parallel_spawn and other orchestration callers to get deterministic task outputs.

Success criteria

- API: A stable function-level API and an HTTP endpoint (optional) that callers can use to request waiting for a run id and retrieve final transcript/result.
- Reliability: For >99% of runs, the helper returns the final transcript within configured timeout without missing messages or returning partial transcripts.
- Safety: No blocking of gateway main thread; supports cancellation and timeouts. Backoff/polling must avoid tight loops and must be configurable.
- Compatibility: Works with existing gateway auth/token mechanisms and requires no changes for callers other than invoking the helper API.
- Tests: Unit and integration tests cover normal completion, timeouts, transient failures, cancellations, and transcript extraction correctness.

2. API design for the gateway helper

Design principles

- Provide two interfaces: (A) internal function API for in-process callers (preferred for internal orchestration), (B) HTTP REST API for cross-process usage (optional, behind auth). Both share the same behavior and configuration.
- Use existing gateway auth tokens for HTTP access; internal calls use token or internal auth context.

Function-level API (TypeScript pseudocode)

// Wait for a subagent run to finish and return the final transcript.
async function waitForRunCompletion(options: {
runId: string; // required: run/session id to wait for
timeoutMs?: number; // optional overall timeout (default 120000)
pollIntervalMs?: number; // initial poll interval (default 500)
maxPollIntervalMs?: number; // maximum poll interval (default 5000)
backoffFactor?: number; // multiplier for exponential backoff (default 1.5)
allowPartial?: boolean; // if true, return partial transcript on timeout (default false)
cancelToken?: CancelToken; // cancellation token supporting .isCancelled() and .onCancel(cb)
resultFormat?: 'full'|'transcript'|'summary'|'raw'; // returned format
}): Promise<RunResult>

Return type RunResult {
runId: string;
status: 'completed' | 'failed' | 'cancelled' | 'timeout' | 'unknown';
finishedAt?: string; // ISO timestamp when run finished (if available)
transcript?: string; // canonical session transcript
outputs?: Record<string, any>; // structured outputs if available
raw?: any; // raw session object for debugging
attempts: number; // poll attempts
}

HTTP API (optional)

POST /gateway/v1/wait-run
Headers: Authorization: Bearer <token>
Body (JSON): { runId, timeoutMs?, pollIntervalMs?, maxPollIntervalMs?, backoffFactor?, allowPartial?, resultFormat? }
Response 200: { runId, status, finishedAt?, transcript?, outputs?, raw?, attempts }
Error codes: 400 (bad request), 401 (unauthenticated), 404 (run not found), 408 (timeout), 500 (internal)

Auth

- Use existing gateway JWT/bearer token verification. No new auth scheme.
- HTTP access restricted to internal services by default (network ACLs). Optionally enable via feature flag.

3. Internal implementation details

Overview

- Try to use push-based notifications first: subscribe to gateway run state events (if event bus exists: in-memory events, Redis pub/sub, or message broker). If the run publish/subscribe is present, the helper registers a listener and resolves immediately when the run finishes. If no push facility or listener missed event, fallback to robust polling with exponential backoff.

Files to modify/create (suggested)

- gateway/src/helpers/run_waiter.ts (new)
- gateway/src/api/waitRunApi.ts (new, thin HTTP wrapper if needed)
- gateway/src/events/runEvents.ts (augment if needed to expose event subscription API)
- gateway/src/services/runService.ts (update: expose read-only run state retrieval functions used by waiter)
- gateway/tests/run_waiter.unit.spec.ts (new)
- gateway/tests/run_waiter.integration.spec.ts (new)

Dependencies

- Use existing gateway logging, metrics utilities, and auth utils. Use existing run/session storage API (e.g., runService.getRun(runId), runService.getTranscript(runId)).

Pseudo-code for waitForRunCompletion (TypeScript-like)

async function waitForRunCompletion(opts) {
const {
runId,
timeoutMs = 120000,
pollIntervalMs = 500,
maxPollIntervalMs = 5000,
backoffFactor = 1.5,
allowPartial = false,
cancelToken,
resultFormat = 'full'
} = opts;

const start = Date.now();
let attempt = 0;
let interval = pollIntervalMs;
let lastSeenVersion = null; // optional: track run state version/sequence

// 1) Fast path: subscribe to run events
const eventPromise = trySubscribeToRunEvents(runId, (event) => {
if (event.type === 'run_finished' || event.type === 'run_failed' || event.type === 'run_cancelled') {
// resolve with event payload
resolveWithRunResult(event.payload);
}
});

// Create a race between eventPromise and polling fallback
return await Promise.race([
eventPromise,
(async () => {
while (true) {
if (cancelToken?.isCancelled()) {
return buildResult(runId, 'cancelled', null, attempt);
}

        attempt += 1;

        // Query run state
        let run = null;
        try {
          run = await runService.getRun(runId);
        } catch (err) {
          log.warn('Transient error reading run', { runId, err });
          // transient error: sleep and continue
        }

        if (run) {
          if (isTerminal(run.status)) {
            const transcript = await safeGetTranscript(runId);
            return buildResultFromRun(run, transcript, attempt);
          }
          // Optionally track incremental updates: lastSeenVersion = run.version
        }

        const elapsed = Date.now() - start;
        if (elapsed >= timeoutMs) {
          if (allowPartial) {
            const partial = await safeGetTranscript(runId).catch(() => null);
            return buildResult(runId, 'timeout', partial, attempt);
          }
          return buildResult(runId, 'timeout', null, attempt);
        }

        // Sleep with jitter
        await sleep(interval + jitter());
        // Backoff
        interval = Math.min(interval * backoffFactor, maxPollIntervalMs);
      }
    })()

]).finally(() => {
// cleanup subscription if any
unsubscribeRunEvents(runId);
});
}

Helper: safeGetTranscript

- Attempts to read transcript via runService.getTranscript(runId) with retries (short: 3 attempts) and small backoff. If transcript extraction fails with non-transient error, include raw run object and error in the response.

Event subscription implementation

- If gateway has internal event bus: add runEvents.subscribe(runId, callback) API that returns unsubscribe. The helper subscribes with a timeout; if not called within small window (e.g., 1s) it still falls back to polling.
- If no event bus, add a lightweight Redis/IPC pubsub channel 'run:events' and make run manager publish terminal events when runs finish. The helper subscribes to that channel.

Error handling

- Transient read errors (DB/network): log and retry; do not escalate immediately.
- Permanent errors: include raw error in result.raw or throw a GatewayHelperError with error details.
- Authorization errors (HTTP): return 401.
- Run not found: return 404.
- Timeout: return structured result with status='timeout' and attempts count. If allowPartial true, attempt to return best-effort transcript.

Timeouts and backoff

- Defaults: timeoutMs=120000 (2m), pollIntervalMs=500ms, max=5000ms, backoffFactor=1.5. These are tunable via config and per-call parameters.
- Add maxAttempts computed from timeout and backoff to avoid infinite loops.
- Use jitter at each sleep: +/-10% to avoid thundering herd.

Cancellation

- Accept a cancelToken supporting .isCancelled() and .onCancel(cb). If cancelled, return immediately with status='cancelled'. Ensure any long-running reads are aborted if underlying data layer supports cancellation.

Concurrency and non-blocking

- Do not block gateway event loop: all IO is async. For HTTP API, spawn background async task only if request asks for notification subscription; otherwise reply when result available.
- Limit parallel waiter instances per gateway to a configurable cap (to avoid resource exhaustion). If cap exceeded, fail fast with 429 or queue with limited capacity.

4. Backwards compatibility and migration notes

- Backwards compatibility
  - Existing callers that don't use new helper are unaffected.
  - parallel_spawn should be updated to call waitForRunCompletion to capture outputs; keep existing code path as fallback for a release cycle.

- Migration plan
  - 1. Add the helper as an internal-only function and tests. Do not change callers.
  - 2. Modify parallel_spawn to optionally call the helper behind a feature flag (e.g., feature.wait_run_helper = 'on'/'off'). Use default 'off' for initial deployment.
  - 3. Enable the flag in canary region/hosts, run integration tests.
  - 4. Flip default to 'on' after monitoring.

- Database/schema
  - No schema changes required unless we add event publishing metadata. If we introduce run.version or sequence numbers, make additive non-breaking fields.

5. Tests

Unit tests (gateway/tests/run_waiter.unit.spec.ts)

- should return completed run and transcript when runService reports terminal status
  - Mock runService.getRun -> terminal status + runService.getTranscript -> string
  - Assert returned status 'completed' and transcript matches
- should return failed status when runService reports failed
- should return timeout when run never reaches terminal state within timeout
  - Use short timeout and assert status 'timeout'
- should return partial transcript on timeout when allowPartial=true
  - Mock getTranscript to return partial
- should respect cancellation token
  - Cancel before completion and assert status 'cancelled'
- should use backoff between polls
  - Spy on sleep calls or mock timers to assert backoff increase
- should handle transient errors from runService.getRun (retry)
  - Mock initial errors then success

Integration tests (gateway/tests/run_waiter.integration.spec.ts)

- end-to-end: spawn a real subagent run (or integration stub) that finishes successfully
  - Call waitForRunCompletion and assert returned final transcript and outputs
- event-push path: ensure when run manager publishes terminal event helper resolves via subscription (test uses real event bus or redis stub)
- poll-fallback path: simulate missed event and assert polling still returns correct result
- heavy-load test: start N waiters concurrently and assert system remains responsive and respects configured cap

What to assert

- Correct status and transcript
- Attempts count reasonable
- No unhandled rejections
- Logs contain helpful context on failures

Test harness notes

- Use dependency injection to inject mocked runService and event bus for unit tests.
- Integration tests may use a lightweight in-memory event bus and ephemeral runs.

6. Rollout plan

Phased rollout

1. Developer preview (branch / CI): implement helper, unit tests, integration tests. Do not modify callers.
2. Internal canary: enable helper in gateway hosts used by CI and a small percentage (e.g., 5%) of traffic via feature flag. Update parallel_spawn to call helper when flag=true.
3. Monitor for errors and performance for 48–72 hours.
4. Gradually increase traffic (25% -> 50% -> 100%) and flip default flag to on after stability.
5. Remove old fallback code after one release cycle.

Feature flags

- Add config.gateway.waitRunHelper.enabled: boolean/default false
- Add config.gateway.waitRunHelper.maxConcurrent: number default 100

Metrics to monitor

- helper.wait.duration (histogram) — time from request start to resolution
- helper.wait.attempts (counter/histogram)
- helper.wait.timeouts (counter)
- helper.wait.errors (counter) — transient vs permanent
- helper.wait.concurrent (gauge)
- downstream metric: parallel_spawn.missing_outputs (should drop towards 0 after rollout)
- resource metrics: memory and CPU per gateway instance

Alerting

- If helper.wait.timeouts > threshold (e.g., 0.5% of calls) for 15m, raise P1
- If helper.wait.errors spike or helper.wait.concurrent hits cap, alert

Canary criteria

- No increase in end-to-end failure rate
- Timeouts < X% (configurable)
- CPU/memory within normal bounds

7. Estimated effort and risks

Estimated effort (engineering days)

- Design & API: 0.5 days
- Implementation core (run_waiter, subscriptions, safe transcript extraction): 2–3 days
- HTTP wrapper & auth integration (optional): 0.5 day
- Tests (unit + integration): 1.5 days
- CI + rollout + monitoring dashboards: 1 day
- Total: ~5–7 engineering days (1 engineer)

Risks

- Missed events: if run manager doesn't publish terminal events reliably, helper will rely on polling; ensure run manager publishes reliably.
- Thundering herd: many waiters polling same run store could overload DB. Mitigations: backoff, jitter, subscription/push approach, cap concurrent waiters.
- Partial transcripts: transcript extraction might be eventually consistent; some runs may not have final transcript immediately. Use retries and small delay before final read.
- Authorization/ACL mistakes: ensure HTTP endpoint uses existing auth tokens and does not inadvertently expose internal state.
- Deadlocks: avoid blocking sync waiting; implement cancellation and max concurrency to prevent resource exhaustion.

Appendix: Example sequence diagrams (brief)

A) Push path (preferred)
Client -> gateway.waitForRunCompletion(runId)
gateway.waitForRunCompletion subscribes to event bus for runId
Runner -> gateway.runManager finishes run -> publish run:finished(runId)
gateway.waitForRunCompletion receives event -> call runService.getTranscript(runId) -> return RunResult

B) Poll fallback
Client -> gateway.waitForRunCompletion(runId)
gateway.waitForRunCompletion polls runService.getRun(runId) with backoff
When runService shows terminal status -> call getTranscript -> return RunResult

Notes for developer

- Reuse existing logging and metrics utilities.
- Keep implementation small and testable. Inject runService and eventBus for unit testing.
- Document config knobs in gateway configuration file and in README.

---

File created at: /root/.openclaw/workspace/openclaw-fork/GATEWAY_HELPER_PLAN.md
