---
phase: 01-infrastructure-auth
plan: 02
type: execute
wave: 2
depends_on:
  - 01-PLAN-scaffold.md
files_modified: []
autonomous: false
requirements:
  - AUTH-01
  - AUTH-02

user_setup:
  - service: cloudflare-pages
    why: "Host the static site and run the auth middleware as a Pages Function"
    env_vars:
      - name: SITE_PASSWORD
        source: "You choose this value — set it in Cloudflare Pages dashboard → Settings → Environment Variables (type: Secret). Apply to both Production and Preview environments."
    dashboard_config:
      - task: "Create Cloudflare Pages project connected to the GitHub repository"
        location: "Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git"
      - task: "Set build configuration (no build step)"
        location: "Pages project → Settings → Builds & deployments"
      - task: "Set SITE_PASSWORD secret for Production environment"
        location: "Pages project → Settings → Environment Variables → Add variable (type: Secret)"
      - task: "Set SITE_PASSWORD secret for Preview environment"
        location: "Pages project → Settings → Environment Variables → Add variable (type: Secret, environment: Preview)"

must_haves:
  truths:
    - "Cloudflare Pages project exists and is connected to the GitHub repository main branch"
    - "Pushing to main triggers an automatic production deployment"
    - "SITE_PASSWORD is set as an encrypted Secret for both Production and Preview environments"
    - "Visiting the live URL without credentials returns HTTP 401 and triggers the browser native login dialog"
    - "Visiting the live URL with the correct password returns HTTP 200 and serves the German placeholder page"
    - "Visiting the live URL with a wrong password returns HTTP 401"
  artifacts:
    - path: "Cloudflare Pages project"
      provides: "Live deployment connected to GitHub"
    - path: "Cloudflare Pages Environment Variables"
      provides: "SITE_PASSWORD secret (encrypted, never visible after saving)"
  key_links:
    - from: "GitHub main branch push"
      to: "Cloudflare Pages production deployment"
      via: "Git integration webhook"
    - from: "Cloudflare Pages runtime"
      to: "functions/_middleware.js"
      via: "Pages Functions _middleware convention — runs on every request"
    - from: "functions/_middleware.js"
      to: "env.SITE_PASSWORD"
      via: "Pages Functions runtime env binding (set in dashboard as Secret)"
---

<objective>
Connect the GitHub repository to Cloudflare Pages, configure the project (no build step,
public/ output directory), set the SITE_PASSWORD secret for all environments, trigger a
deployment, and verify that the live site correctly enforces HTTP Basic Auth.

Purpose: Turn the code created in Plan 01 into a live, password-protected URL. This is the
Phase 1 success criterion — the site must be unreachable without the correct password.

Output: A live Cloudflare Pages URL where:
- No credentials → 401 + browser native login prompt
- Correct password → 200 + German placeholder page
- Wrong password → 401
</objective>

<execution_context>
@.github/get-shit-done/workflows/execute-plan.md
@.github/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/01-infrastructure-auth/01-CONTEXT.md
@.planning/phases/01-infrastructure-auth/01-RESEARCH.md
@.planning/phases/01-infrastructure-auth/01-01-SUMMARY.md
</context>

<tasks>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 1: Create Cloudflare Pages project + set SITE_PASSWORD secret</name>

  <read_first>
    - .planning/phases/01-infrastructure-auth/01-RESEARCH.md
      (Section 1: "Connecting Pages to GitHub" steps; Section 3: "Cloudflare Pages Environment
       Variables" — dashboard path, Secret type, both environments)
    - .planning/phases/01-infrastructure-auth/01-CONTEXT.md
      (D-01: GitHub→Pages auto-deploy; D-02: preview branches auto-deployed;
       D-03: auth on ALL previews — SITE_PASSWORD must be set for Preview environment too;
       D-04: password as secret, never in source)
  </read_first>

  <what-built>
    Plan 01 created three files (functions/_middleware.js, public/index.html, .gitignore) and
    committed them to the main branch on GitHub. The code is ready; the Cloudflare project
    does not exist yet. This checkpoint creates it.
  </what-built>

  <how-to-verify>
    Complete ALL of the following steps in order:

    **1. Confirm Plan 01 files are on GitHub main**
    - Visit your GitHub repository → verify `functions/_middleware.js`, `public/index.html`,
      and `.gitignore` are present on the `main` branch.

    **2. Create the Cloudflare Pages project**
    - Go to: https://dash.cloudflare.com → Workers & Pages → Create → Pages
    - Select **"Connect to Git"**
    - Authorise Cloudflare to access GitHub if prompted
    - Select your Birthday repository → branch: `main`
    - Build settings:
      - **Framework preset:** None
      - **Build command:** (leave EMPTY — no build step)
      - **Build output directory:** `public`
      - **Root directory:** `/` (repo root)
    - Click **"Save and Deploy"** — Cloudflare will run a first deployment

    **3. Set SITE_PASSWORD for the Production environment**
    - Pages project → **Settings** → **Environment Variables**
    - Click **"Add variable"**
    - Name: `SITE_PASSWORD`
    - Value: *(choose a strong password — random letters/numbers, >12 chars, no colons)*
    - Type: **Secret** (encrypted — value is hidden after saving)
    - Environment: **Production**
    - Save

    **4. Set SITE_PASSWORD for the Preview environment (D-03)**
    - Same panel → **Add variable** again
    - Name: `SITE_PASSWORD`
    - Value: *(same password as Production)*
    - Type: **Secret**
    - Environment: **Preview**
    - Save

    **5. Trigger a redeploy so the secret is available**
    - Pages project → **Deployments** → click the latest deployment → **"Retry deployment"**
      (or push any commit to main — either triggers a redeploy with the secret now injected)

    **6. Note your Pages URL**
    - After deployment succeeds, your site URL is shown as `<project-name>.pages.dev`
    - Record this URL — it is needed in Task 2.

    ⚠️  IMPORTANT — do NOT set the password as a plain "Environment Variable".
    It MUST be type **Secret**. Plain environment variables are visible in deployment logs;
    Secrets are encrypted and never exposed.
  </how-to-verify>

  <acceptance_criteria>
    - Cloudflare Pages project exists and shows a successful deployment in the Deployments tab
    - SITE_PASSWORD is listed under Environment Variables for both Production and Preview
      environments (value shows as "Encrypted")
    - A `<project-name>.pages.dev` URL is available
  </acceptance_criteria>

  <resume-signal>
    Type "deployed" once the Pages project is live and both Production and Preview secrets
    are set. Include the Pages URL (e.g. "deployed — birthday-site.pages.dev").
  </resume-signal>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Verify live auth — 401 without creds, 200 with correct password, 401 with wrong password</name>

  <read_first>
    - .planning/phases/01-infrastructure-auth/01-RESEARCH.md
      (Section 8: "Validation Architecture" — the exact curl commands to use)
    - .planning/phases/01-infrastructure-auth/01-CONTEXT.md
      (Phase success criteria; D-03: auth on all previews)
  </read_first>

  <what-built>
    The live Cloudflare Pages deployment is running with functions/_middleware.js enforcing
    Basic Auth via SITE_PASSWORD. This checkpoint verifies the three success criteria from
    ROADMAP.md Phase 1.
  </what-built>

  <how-to-verify>
    Replace `<YOUR_SITE_URL>` with your actual Pages URL (e.g. `birthday-site.pages.dev`)
    and `<YOUR_PASSWORD>` with the password you set in Task 1.

    Run each curl command and confirm the expected HTTP status code:

    **Test 1 — No credentials → 401 + browser login prompt (AUTH-02)**
    ```bash
    curl -s -o /dev/null -w "%{http_code}" https://<YOUR_SITE_URL>
    ```
    Expected: `401`

    Also open `https://<YOUR_SITE_URL>` in a browser — the browser's native login dialog
    must appear (username/password popup — not a custom HTML page).

    **Test 2 — Wrong password → 401 (AUTH-02)**
    ```bash
    curl -s -o /dev/null -w "%{http_code}" -u "user:wrongpassword" https://<YOUR_SITE_URL>
    ```
    Expected: `401`

    **Test 3 — Correct password → 200 + German placeholder (AUTH-01)**
    ```bash
    curl -s -u "user:<YOUR_PASSWORD>" https://<YOUR_SITE_URL>
    ```
    Expected: HTTP 200. Response body must contain `Seite wird bald`.
    ```bash
    curl -s -u "user:<YOUR_PASSWORD>" https://<YOUR_SITE_URL> | grep "Seite wird bald"
    ```
    Expected: line containing `Seite wird bald` is printed.

    **Test 4 — Username is ignored (any username + correct password → 200)**
    ```bash
    curl -s -o /dev/null -w "%{http_code}" -u "gast:<YOUR_PASSWORD>" https://<YOUR_SITE_URL>
    ```
    Expected: `200`

    **Test 5 — WWW-Authenticate header is present on 401 response**
    ```bash
    curl -s -I https://<YOUR_SITE_URL> | grep -i "www-authenticate"
    ```
    Expected: line containing `WWW-Authenticate: Basic realm="Birthday Site"`

    All five tests must pass before this checkpoint is complete.
  </how-to-verify>

  <acceptance_criteria>
    - `curl -s -o /dev/null -w "%{http_code}" https://<YOUR_SITE_URL>` returns `401`
    - Browser visit to `https://<YOUR_SITE_URL>` shows the browser native login dialog
    - `curl -s -o /dev/null -w "%{http_code}" -u "user:wrongpassword" https://<YOUR_SITE_URL>` returns `401`
    - `curl -s -o /dev/null -w "%{http_code}" -u "user:<YOUR_PASSWORD>" https://<YOUR_SITE_URL>` returns `200`
    - `curl -s -u "user:<YOUR_PASSWORD>" https://<YOUR_SITE_URL> | grep "Seite wird bald"` prints a match
    - `curl -s -I https://<YOUR_SITE_URL> | grep -i "www-authenticate"` prints `WWW-Authenticate: Basic realm="Birthday Site"`
  </acceptance_criteria>

  <resume-signal>
    Paste the output of all five curl commands. Type "verified" once all tests pass.
    If any test fails, describe which test failed and what the actual output was.
  </resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → Cloudflare Edge | HTTP request with Authorization header — internet-facing |
| Cloudflare Dashboard → env store | SITE_PASSWORD written to Cloudflare's encrypted secrets store via dashboard or CLI |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-01 | Information Disclosure | SITE_PASSWORD during dashboard setup | mitigate | Set as **Secret** type (not plain Environment Variable). Secrets are encrypted at rest and masked in logs. Task 1 explicitly instructs "type: Secret" and warns against plain variable type. |
| T-02-02 | Information Disclosure | SITE_PASSWORD in browser history / clipboard | accept | Personal workflow risk — user sets the password once. Acceptable for a personal event site. Advise using a password manager. |
| T-02-03 | Spoofing | Production URL accessible without auth if secret is missing from an environment | mitigate | Task 1 explicitly requires setting SITE_PASSWORD for BOTH Production and Preview environments (D-03). Task 2 verification tests confirm 401 on the live URL before marking phase complete. |
| T-02-04 | Repudiation | No log of who set the secret or when | accept | Cloudflare audit logs are available on paid plans. Free tier: acceptable residual risk for a personal site. |
</threat_model>

<verification>
Phase 1 is complete when ALL of the following are true:

```bash
# Code: middleware has correct structure
grep -c "export async function onRequest" functions/_middleware.js   # 1
grep -c "env\.SITE_PASSWORD" functions/_middleware.js               # ≥1
grep -c "WWW-Authenticate" functions/_middleware.js                 # ≥1

# Code: placeholder in German
grep -c 'lang="de"' public/index.html                              # 1

# Code: secrets excluded
grep -c "\.dev\.vars" .gitignore                                    # 1

# Live site: 401 without credentials
curl -s -o /dev/null -w "%{http_code}" https://<YOUR_SITE_URL>     # 401

# Live site: 200 with correct password + German content
curl -s -u "user:<PASSWORD>" https://<YOUR_SITE_URL> | grep "Seite wird bald"  # match

# Live site: 401 with wrong password
curl -s -o /dev/null -w "%{http_code}" -u "user:wrong" https://<YOUR_SITE_URL>  # 401
```

Phase 1 success criteria from ROADMAP.md:
1. ✅ Visiting the site URL without credentials shows a browser native login prompt
2. ✅ Entering the correct password grants access (German placeholder loads)
3. ✅ Entering a wrong password is rejected — prompt re-appears or shows 401
</verification>

<success_criteria>
- Cloudflare Pages project connected to GitHub main branch with automatic deployments enabled
- SITE_PASSWORD set as encrypted Secret for both Production and Preview environments
- Live URL returns 401 + `WWW-Authenticate: Basic realm="Birthday Site"` for unauthenticated requests
- Live URL returns 200 + `Seite wird bald` HTML for requests with the correct password
- Live URL returns 401 for requests with an incorrect password
- AUTH-01 ✅ (correct password grants access)
- AUTH-02 ✅ (unauthenticated requests rejected with 401 + browser prompt)
</success_criteria>

<output>
After completion, create `.planning/phases/01-infrastructure-auth/01-02-SUMMARY.md` using the
template at `.github/get-shit-done/templates/summary.md`.

Key facts to record:
- Cloudflare Pages project name and URL (pages.dev domain)
- Deployment trigger: push to main → automatic production deploy
- Secret name: SITE_PASSWORD (set for both Production and Preview)
- Auth verification: all five curl tests passed
- Phase 1 requirements AUTH-01 and AUTH-02 are satisfied
</output>
