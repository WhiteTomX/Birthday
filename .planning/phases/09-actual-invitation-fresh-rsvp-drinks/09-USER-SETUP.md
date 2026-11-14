# Phase 9: User Setup Required

**Generated:** 2026-11-14
**Phase:** 09-actual-invitation-fresh-rsvp-drinks
**Status:** Incomplete

Production remains unchanged. Complete the owner-only configuration and authorization steps before considering a remote migration.

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `PARK_ENTRY_DIRECTIONS` | Birthday project owner; provide the exact guest-facing park-entry wording | Cloudflare Pages → Birthday → Settings → Variables and Secrets → Production |
| [ ] | `BUFFET_LIST_URL` (optional) | Owner-provided contribution URL, only if intended | Cloudflare Pages → Birthday → Settings → Variables and Secrets → Production |

## Dashboard Configuration

- [ ] Confirm the production Pages project is **Birthday** and its `DB` binding points to the intended `birthday-rsvps` D1 database. Recheck the live binding; the repository configuration alone is not target authorization.
- [ ] Confirm `PARK_ENTRY_DIRECTIONS` is set in the production environment.
- [ ] Decide whether `BUFFET_LIST_URL` should remain unset or be configured. Do not add a placeholder link.
- [ ] Merge the schema-change PR containing `migrations/0002_fresh_rsvp_round.sql`.
- [ ] Explicitly authorize the named Pages project and D1 database before any remote migration command.

## Verification

Local verification already passed with an isolated D1 store. After the PR is merged and explicit authorization is given:

1. Recheck the live Pages project and `DB` binding against the authorized target.
2. Run `wrangler d1 migrations list birthday-rsvps --remote` and verify all earlier migrations are applied and `0002_fresh_rsvp_round.sql` is the sole pending migration.
3. If any other migration is pending or the output is inconclusive, stop without running an apply command.
4. Only when every gate passes, apply the one approved migration and verify it in the D1 dashboard. Do not deploy or apply unrelated migrations.

---

**Once all items complete:** Mark status as "Complete".
