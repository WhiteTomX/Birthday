# Phase 1: Infrastructure & Auth - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-10
**Phase:** 1-Infrastructure & Auth
**Areas discussed:** Deployment workflow, Password management, Protected scope, Phase 1 placeholder

---

## Deployment Workflow

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub-connected auto-deploy | Push to main → Cloudflare builds & deploys automatically | ✓ |
| Manual wrangler CLI | Run `wrangler pages deploy` from local machine | |

**User's choice:** GitHub-connected auto-deploy

---

| Option | Description | Selected |
|--------|-------------|----------|
| main only | Production deploys on every push to main | |
| main + preview branches | PRs/branches get preview URLs too | ✓ |

**User's choice:** main + preview branches

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — auth on previews | Preview URLs also enforce Basic Auth | ✓ |
| No — previews unprotected | Easier to test without credentials | |

**User's choice:** Yes — all preview deployments also enforce Basic Auth

---

## Password Management

| Option | Description | Selected |
|--------|-------------|----------|
| Cloudflare secret / env var | Set via dashboard or `wrangler secret put`; never in source code | ✓ |
| Config file in repo | Simpler but password in git history | |

**User's choice:** Cloudflare secret / env var

---

| Option | Description | Selected |
|--------|-------------|----------|
| Plain text comparison | Simpler, fine for a personal event site | ✓ |
| Hashed (bcrypt or similar) | More secure, extra Worker complexity | |

**User's choice:** Plain text comparison

---

| Option | Description | Selected |
|--------|-------------|----------|
| Single shared password | One password for all guests | ✓ |

**User's choice:** Single shared password for all guests
**Notes:** User also requested logging wrong password attempts to the DB. After discussion, D1 setup was deferred to Phase 3 — logging will be revisited then.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — set up D1 in Phase 1 | Create D1 with a failed_auth_attempts table; reuse in Phase 3 | |
| No — defer D1 to Phase 3 | Skip logging for now | ✓ |

**User's choice:** Defer D1 to Phase 3; skip auth logging in Phase 1

---

## Protected Scope

| Option | Description | Selected |
|--------|-------------|----------|
| All requests | Worker intercepts everything; nothing loads before auth | ✓ |
| HTML only | CSS/images/JS load without credentials; only HTML is gated | |

**User's choice:** All requests — everything is protected

---

## Phase 1 Placeholder

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal "coming soon" placeholder | Just enough to prove auth works | ✓ |
| Styled preview | Basic page with event date/name, shareable now | |

**User's choice:** Minimal placeholder

---

| Option | Description | Selected |
|--------|-------------|----------|
| English | Dev placeholder, language doesn't matter | |
| German | Consistent with rest of site | ✓ |

**User's choice:** German — consistent with the site

---

## Agent's Discretion

None — all areas had clear user decisions.

## Deferred Ideas

- **Failed auth attempt logging to D1** — user raised this during password management discussion. Deferred because D1 is not being set up in Phase 1. Revisit when D1 is introduced in Phase 3.
