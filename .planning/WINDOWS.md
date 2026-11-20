---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 0
total_count: 1
last_updated: 2026-11-20T18:26:47.233Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 09 | unrun-verify | public/style.css |  | Manual desktop/narrow-mobile visual inspection remains outstanding. | open |  | 2026-11-20T18:26:47.233Z |  |

````json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "09",
    "file": "public/style.css",
    "line": null,
    "description": "Manual desktop/narrow-mobile visual inspection remains outstanding.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-11-20T18:26:47.233Z",
    "resolved_at": null,
    "milestone": "v2.0"
  }
]
````
