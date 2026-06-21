---
created: 2026-06-20T11:11:56.217Z
title: Support two passwords for joint 30th birthday party
area: general
resolves_phase: 7
files:
  - functions/_middleware.js
  - public/index.html
---

## Problem

A friend also turns 30 and they want to throw a joint birthday party. The site currently only accepts one password (geburtstag1 from .dev.vars). The site needs to accept two passwords — one per birthday person — so both sets of guests can access the site. The text/content should also be updated to reflect the joint celebration.

Planned for milestone v1.3.

## Solution

1. Update `functions/_middleware.js` to accept multiple passwords (check against an array or multiple env vars, e.g. SITE_PASSWORD and SITE_PASSWORD_2).
2. Update `.dev.vars` and production secrets to include both passwords.
3. Update `public/index.html` (and any other public-facing copy) to reflect that this is a joint birthday event for two people turning 30.
