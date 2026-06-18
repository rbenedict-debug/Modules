# Onflo — Department Modules & Unified User Management

A design-mode prototype: a clickable Angular mock-up of Onflo's **department modules**, the
**persona / module switcher**, and how a user's access gates what they see across the nav and
Settings. Built with the real [Onflo Design System](https://github.com/rbenedict-debug/Design-System).

> **It's a prototype — no backend.** Button labels, dialogs, and flows are real and clickable, but
> nothing is saved to a server. For what's built vs. mocked vs. planned — and how to read it —
> see **[docs/department-modules-architecture.md](docs/department-modules-architecture.md)**.

---

## Review the prototype

### Live preview

Once published to GitHub Pages: **https://rbenedict-debug.github.io/Modules/**

Not live yet — to publish (one-time setup):

1. **Settings → Pages → Build and deployment → Source: _GitHub Actions_**.
2. **Actions → "Deploy prototype to GitHub Pages" → Run workflow**, and pick the branch
   (`unified-user-management-port` now, or `main` after it's merged).
3. The link above goes live in ~2 minutes, and refreshes on every later run / push to `main`.

> Pages on a **private** repo requires **GitHub Pro**. On the Free plan, either make the repo
> public (fine for a design prototype) or upgrade. Either way the deployed site is viewable by
> anyone with the link, while the source stays private.

### What to try

The prototype is best explored as different users. Press **⌘K / Ctrl+K** to open the **persona
swapper**, then watch the sidebar and Settings change with each persona's access:

| Persona | Role | What it demonstrates |
|---|---|---|
| **Scarlett Bailey** | Global Admin | Everything. Use the top-nav **module switcher** to scope into a department and watch the nav + Settings reflect what that module includes. |
| **Marcus Lee** | Admin — Transportation + Classic | Has a switcher (2 modules); neither includes Assets, so **no Assets**; **no Global** Settings (he isn't a global admin). |
| **Linda Okafor** | Admin — HR | HR is granted **Integration Hub** access → she sees a **scoped** hub (Installed Apps only). |
| **James Carter** | Agent — IT | Agents get **no Analytics, no Settings** — just Tickets, Assets (IT has assets), Users. |
| **Hannah Cohen** | Agent — Facilities | Same agent view; Facilities also has Assets. |

Things to notice:

- Switch **Scarlett → Classic**: Assets, the **Global** Settings section, and **Integration Hub** all disappear (Classic doesn't include them).
- The **Global** Settings section only appears in the **Global** context — scope into any module and it's gone.
- **Integration Hub** is global-admin-only, *except* a department a global admin has granted access (here, HR) sees a scoped version.

---

## Run it locally

Requires **Node 22** (20.19+ also works).

```bash
npm install      # first time — in Claude Code, run /setup-project instead
npm start        # → http://localhost:4200
```

---

## Project map

| Path | What |
|---|---|
| `src/app/data/` | Models + state services (`modules`, `persona`, `module-context`, `integrations`) — the source of truth for access & visibility |
| `src/app/components/` | Module switcher, ⌘K command palette, snackbar host |
| `src/app/pages/` | Tickets, Assets, Users, Analytics, Settings (incl. Department Modules) |
| `src/app/app.ts` · `app.html` | Shell: nav, routing, Settings subnav + gating |
| `docs/department-modules-architecture.md` | Engineering handoff doc — built vs. mocked vs. planned |
| `.github/workflows/deploy.yml` | GitHub Pages deploy (see [Live preview](#live-preview)) |

---

## Design system

- **Visual catalog** — open `node_modules/@onflo/design-system/preview/index.html` in a browser after install.
- **Update the DS version** — run `/update-design-system` in Claude Code.

---

## Engineering handoff

Share this repo with engineering. Start with
**[docs/department-modules-architecture.md](docs/department-modules-architecture.md)**, then switch
the mode in `CLAUDE.md` from design to engineering to wire up real data and behavior.
