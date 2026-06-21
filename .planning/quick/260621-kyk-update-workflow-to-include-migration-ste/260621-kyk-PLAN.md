---
phase: 260621-kyk
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [CLAUDE.md]
autonomous: true
requirements: [QUICK-01]
must_haves:
  truths:
    - "CLAUDE.md reflects the dual-password format from .dev.vars"
    - "CLAUDE.md documents how to run D1 migrations locally and in production"
  artifacts:
    - path: "CLAUDE.md"
      provides: "Accurate developer workflow instructions"
      contains: "SITE_PASSWORD__0"
  key_links:
    - from: "CLAUDE.md"
      to: ".dev.vars"
      via: "credential examples match actual file"
      pattern: "SITE_PASSWORD__0"
---

<objective>
Update CLAUDE.md to reflect the phase 7 changes: dual passwords and D1 migrations.

Purpose: Keep developer instructions accurate so future Claude sessions and contributors use correct credentials and know to apply migrations.
Output: Updated CLAUDE.md with fixed credential references and a new D1 Migrations section.
</objective>

<execution_context>
@C:/Users/WhiteTom/Projects/Birthday/.claude/gsd-core/workflows/execute-plan.md
@C:/Users/WhiteTom/Projects/Birthday/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@./.dev.vars
@./wrangler.jsonc
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update CLAUDE.md — dual passwords and D1 migrations</name>
  <files>CLAUDE.md</files>
  <action>
    Make three targeted edits to CLAUDE.md:

    1. **"Local Dev Server" section** — change the credential parenthetical on the second line of the section body from:
       `credentials come from `.dev.vars` (`SITE_PASSWORD=geburtstag1`)`
       to:
       `credentials come from `.dev.vars` (`SITE_PASSWORD__0=geburtstag1`, `SITE_PASSWORD__1=geburtstag2` — either password grants access)`

    2. **"Auth for Local Testing" section** — update the opening sentence from:
       `Password: `geburtstag1` (from `.dev.vars`). Username can be anything.`
       to:
       `Passwords (from `.dev.vars`): `SITE_PASSWORD__0=geburtstag1` or `SITE_PASSWORD__1=geburtstag2`. Either password grants access. Username can be anything.`

       Also update both occurrences of `geburtstag1` in the two-step code block example — they reference the old single password. Replace with `geburtstag1` (still valid as password 0, no change needed there, but add a comment):
       Keep `geburtstag1` in the example URLs — it remains a valid password — but add a comment after the block noting that `geburtstag2` works equally.

    3. **New "D1 Migrations" section** — add immediately before the "## Stack" section:

       ```
       ## D1 Migrations

       The `migrations/` directory contains versioned SQL migrations managed by Wrangler (`migrations_dir` is set in `wrangler.jsonc`).

       **Apply migrations locally** (against the local D1 replica used by `wrangler pages dev`):

       ```
       wrangler d1 migrations apply birthday-rsvps --local
       ```

       **Apply migrations to production** (Cloudflare D1 — requires `wrangler login`):

       ```
       wrangler d1 migrations apply birthday-rsvps
       ```

       Run the local migration command whenever you create a new migration file or set up a fresh local environment. Run the production command as part of every production deployment that includes schema changes.
       ```
  </action>
  <verify>
    <automated>grep -c "SITE_PASSWORD__0" CLAUDE.md</automated>
  </verify>
  <done>
    CLAUDE.md contains "SITE_PASSWORD__0" and "SITE_PASSWORD__1" in the credential sections, and a "D1 Migrations" section exists with both the --local and production wrangler commands. grep returns >= 2 for SITE_PASSWORD__0.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Documentation only | No runtime trust boundaries — this plan only edits a markdown file |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|------------|
| T-kyk-01 | Information Disclosure | CLAUDE.md credential examples | accept | Passwords shown are dev-only values, already in .dev.vars which is gitignored; no production secrets exposed |
</threat_model>

<verification>
After the edit:
- grep "SITE_PASSWORD__0" CLAUDE.md — must appear at least twice (Local Dev Server + Auth sections)
- grep "SITE_PASSWORD__1" CLAUDE.md — must appear at least once
- grep "D1 Migrations" CLAUDE.md — must appear
- grep "migrations apply birthday-rsvps --local" CLAUDE.md — must appear
- grep "migrations apply birthday-rsvps$" CLAUDE.md — must appear (production command without --local)
</verification>

<success_criteria>
CLAUDE.md accurately documents:
1. Dual-password setup (SITE_PASSWORD__0 / SITE_PASSWORD__1) in both the "Local Dev Server" and "Auth for Local Testing" sections
2. D1 migration commands for both local and production environments
</success_criteria>

<output>
Create `.planning/quick/260621-kyk-update-workflow-to-include-migration-ste/260621-kyk-01-SUMMARY.md` when done
</output>
