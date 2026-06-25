# Engineering Architecture — Onflo Modules Prototype

**Date:** 2026-06-23 · **Branch:** `main` · **Status:** Draft for engineering handoff

> The single technical reference for the Onflo Modules prototype. It covers **three projects** that
> ship to engineering separately but share one spine: **Department Modules**
> ([Project 1](#project-1--department-modules)), **Agent Management**
> ([Project 2](#project-2--agent-management)), and **Permission Sets**
> ([Project 3](#project-3--permission-sets-handed-off-separately)).
>
> Read [How to read this doc](#how-to-read-this-doc) and the
> [System overview](#system-overview--how-the-three-projects-fit-together) first — that's the spine
> both teams need — then jump to your project. Open decisions are at the
> [end](#open-questions--need-clarification).

---

## How to read this doc

This product is currently a **design-mode prototype** — a clickable Angular mock-up with no real backend yet. That matters for how to read every statement:

- **What the prototype does is real and exact.** Every button label, validation message, dialog, character limit, `Coming soon` state, empty-state text, and toast below is copied word-for-word from the built UI. Where we quote a message in `code font` — e.g. `Agent created.` — that is the literal string in the prototype's code today (the prototype's code, not production code).
- **What the backend does is not built yet.** Anything about what gets sent to the server — real persistence, real failure messages, live permission enforcement, module activation/setup, audit logging — does not exist in the prototype. Where the intended behavior is known, we give it (flagged 🟡 mocked or ⛔ planned per the [status legend](#status-legend)).

**Who reads what.** Both engineering teams should read the
[System overview](#system-overview--how-the-three-projects-fit-together) and the
[Shared foundation](#shared-foundation) — that's the spine that ties the projects together. Then:

- **Department Modules eng** → [Project 1](#project-1--department-modules).
- **Agent Management eng** → [Project 2](#project-2--agent-management) (and the
  [Permission Sets boundary](#project-3--permission-sets-handed-off-separately), since that UI lives inside Agent Management).
- **Permission Sets** was handed off earlier as its own design;
  [Project 3](#project-3--permission-sets-handed-off-separately) is the boundary plus how it wires into the rest.

---

## System overview — how the three projects fit together

The prototype is three projects on one shared spine. Each can be handed off independently, but they only make sense together: one defines *what modules exist*, one assigns *who gets what*, and one defines *the capability bundles* that assignment hands out.

| Project | Owns | Route(s) | Handoff |
|---|---|---|---|
| **1 · Department Modules** | The module catalog, the top-nav **switcher**, and module-context gating | `/settings/department-modules` | This doc, [Project 1](#project-1--department-modules) |
| **2 · Agent Management** | Managing people — **Agents**, **Teams**, **Authentication** — and the UI that hosts Permission Sets | `/settings/agent-management`, `/settings/agent-management/:id` | This doc, [Project 2](#project-2--agent-management) |
| **3 · Permission Sets** | The permission-set **catalog + editor** and the per-module permission model | *(lives inside Agent Management)* | **Already handed off**; boundary in [Project 3](#project-3--permission-sets-handed-off-separately) |

**The shared spine** (all in `src/app/data/` — see [Where things live](#where-things-live)):

- **`ModulesService`** — single source of truth for the module catalog. Project 1 owns it; everything reads it.
- **`ModuleContextService`** — derives the *current view* (which module you're in, your role there, what nav/Settings you can see) from the active persona. This is the seam between every project.
- **`PersonaService`** — the demo stand-in for the signed-in user and their assignments (swapped via ⌘K). In production this is the real authenticated user.
- **The per-module permission model** — a user holds a permission set *per module* (`User.permissionSetByModule`), a team holds one (`Team.permissionSetId`); both point at `PermissionSetsService`.

**Data flow (the one-paragraph version):** Department Modules defines *what modules exist and what's in them* → Agent Management assigns *who gets which module, what role, which teams, and which permission set* → `ModuleContextService` + the switcher render *what each user actually sees*. Permission Sets defines the *capability bundles* Agent Management hands out. Everything resolves back to a handful of singleton services, so the catalog, the switcher, the agents table, and the agent profile never disagree.

> **Terminology note for anyone who saw the earlier draft.** What was called **"User Management"** is
> now **Agent Management** (Project 2) — the area that assigns modules, roles, teams, and permission
> sets to people. **Permission Sets** (Project 3) is the part that was split out and handed off on its own.

---

## Shared foundation

The spine both teams need. Projects 1 and 2 reference these instead of re-explaining them.

### Status legend

| | Meaning |
|---|---|
| ✅ | **Built** and working in the prototype |
| 🟡 | **Mocked** — works, but static / in-memory (design mode; resets on refresh) |
| ⛔ | **Planned** — not built yet |

### Where things live

**Data & state (`src/app/data/`) — the shared spine and every source of truth:**

| File | Role |
|---|---|
| `models.ts` | All shared interfaces (`User`, `Team`, `PermissionSet`, `Ticket`, `Module`, `Persona`, `ModuleRole`, `ModuleColor`, …) + helpers (`fullName`, `SOURCE_LOCKED_FIELDS`, `FEATURE_CAPABILITY`, `moduleCapabilities`, `CUSTOM_MODULE_DEFAULTS`) |
| `modules.service.ts` | **SSOT** for the module catalog |
| `persona.service.ts` | Demo personas + the active one (the ⌘K signed-in-user stand-in) |
| `module-context.service.ts` | Derives the view (module access, switcher, nav/Settings gating) from the active persona |
| `users.service.ts` | **SSOT** for users/agents (32 seed records) |
| `teams.service.ts` | **SSOT** for teams (9 seed) |
| `tickets.service.ts` | **SSOT** for tickets (40 seed; read-only) |
| `permission-sets.service.ts` | **SSOT** for permission sets (7 seed) + the permission **catalog** |
| `integrations.service.ts` | Mocked integration grants (`managerModuleIds`) |
| `messaging.service.ts` | App-wide toast service |
| `chrome.service.ts` | Subnav open/collapse state (`setEditorOpen` for full-area takeovers) |

**Shell & shared components:**

| File | Role |
|---|---|
| `app.ts` · `app.html` · `app.routes.ts` | Shell: routing, nav gating, theme |
| `components/module-switcher/` | The top-nav switcher (Project 1) |
| `components/command-palette/` | The ⌘K persona swapper |
| `components/snackbar-host/` | The single toast host |

**Per-project pages (`src/app/pages/settings/`):**

| Folder | Project |
|---|---|
| `department-modules/` | **Project 1** — the Department Modules page |
| `agent-management/` | **Project 2** shell + tabs, and the **Project 3** UI (full file breakdown in the [Project 2 overview](#project-2--agent-management)) |

### Module context model

`ModuleContextService` is the heart of the prototype. It takes the active persona (the signed-in user stand-in) and derives:

- **Which module you're in** (the switcher's current context, or Global) and **your role there** (`Admin` / `Agent`).
- **What's visible** — the switcher, the side nav, and the Settings areas (see [Permissions & role gating](#permissions--role-gating)).

🟡 In the prototype this is persona-driven (via ⌘K), not real auth. In production it derives from the authenticated user's real assignments.

### Permissions & role gating

*This was the old "User Management connection." It is the seam between Project 1 and Project 2: Agent Management assigns the access; `ModuleContextService` renders it.*

What a user is assigned — which modules, what role per module, which permission set — changes what's visible across the product:

- **Side nav** — **Assets** shows only in a module that has Asset management (hidden in Classic, appears in IT); **Analytics** shows only in a module with Dashboard analytics and is hidden for agents; **Settings** is hidden for agents.
- **Inside Settings** — each area is gated by context + capability:
  - **Global** is the district-wide admin section. Its district-only items (District Profile, Activity Log, Department Modules, Tags, …) show **only in the Global context**, but the **section header itself shows for any admin** (`isGlobal || canAdminActions`) because **Agent Management lives in it and is reachable by department admins** (gated on `canAdminActions`, ungated within the section) — a department admin sees the Global section containing just Agent Management, and a global admin scoping into a module sees that same slice. Future default-access items for department admins sit beside Agent Management. (`department-modules` stays Global-only and redirects away outside Global; `agent-management` no longer does.)
  - **Automations** needs the module's workflow capability (so custom modules, which omit it, hide Automations); **Assets** needs Asset management.
  - **Integration Hub** — district-level like Global, with a per-department grant exception — see [Integration Hub access](#integration-hub-access).
  - **Tickets** and **Call Center** stay on for every admin for now.

**Now wired in the prototype** (capability + context model): the side-nav Assets/Analytics gates, every Settings area above, and the agent redirect off Analytics/Settings. Visibility derives from the active persona's module + role via `ModuleContextService` — capabilities come from `Module.features`, Global is keyed to the Global context, and integration grants come from `IntegrationsService`. A full per-user permission model belongs to the [Permission Sets](#project-3--permission-sets-handed-off-separately) work.

**How assignment is authored.** A user's per-module access is `User.permissionSetByModule` (module id → permission-set id); a team carries one `Team.permissionSetId`. These are authored in **Agent Management** ([Project 2](#project-2--agent-management)) and resolved against **Permission Sets** ([Project 3](#project-3--permission-sets-handed-off-separately)).

#### Integration Hub access

**Integration Hub is owned by a separate team** — this prototype demonstrates only the *access* behavior, not the integrations feature.

- **Default** — Integration Hub is district-level, like Global: visible only in the **Global context**.
- **Granting a department** — in the **Marketplace** (global-admins-only), a global admin assigns department modules as **managers** of specific integrations ("this integration may be managed by Department X").
- **A granted department's view** — a department managing ≥1 integration sees a **scoped** Integration Hub: only its **Installed Apps**, never the district-level tools (API Tokens, Webhooks, Marketplace).
- **Prototype wiring** — grants are mocked in `IntegrationsService` (each `Integration` carries `managerModuleIds`); `ModuleContextService.canSeeIntegrations` / `managedIntegrations` derive visibility. Demo: **HR is granted DocuSign + BambooHR**, so **Linda** (HR admin) sees the scoped hub while other department admins don't, and the global admin sees the full hub.
- ⛔ **Marketplace assignment UI** — the global-admin screen for granting access is the Integrations team's to build; not mocked here.

### App-wide messaging

One app-wide toast system — `MessagingService` → a single top-center `SnackbarHostComponent` mounted in the shell. Used by the Department Modules request, the switcher, and every Agent Management form.

- **Success toast** — top-center, auto-dismisses after **3s**, manual Dismiss (×).
- **Error toast** — leading error icon + **Retry** + Dismiss; **never auto-dismisses**.
- **In-modal failures** show a DS error alert (`ds-alert--error`) at the top of the open dialog instead — the dialog stays open and its primary button retries.
- **Demo:** mock actions always succeed, so **hold Shift while clicking** simulates a failure (`event.shiftKey`).
- ⚠️ **DS gap** — the DS snackbar has no error variant; failures reuse the text-action shell + a tinted `error` icon. Flag as a DS candidate.
- ⛔ **Production** — drive success/failure from the real result; replace the Shift-simulate with real error handling.

### Session and timeout messaging ⛔

No session, idle, or auth-timeout handling exists yet. (Existing `setTimeout`s are UI timing only — toast dismissal, submit latency, scrollbar — not session timeouts.) Placeholder for session-expiry messaging, request timeouts, and retry-on-timeout.

### Persona swapper (⌘K)

The persona swapper (⌘K / Ctrl+K, `components/command-palette/`) is the tool for *exploring* the prototype as different users — it swaps the active `PersonaService` persona, which re-derives `ModuleContextService` and re-renders the shell. It is a **demo instrument, not a feature**: in production the signed-in user replaces it. ✅ built / 🟡 the personas themselves are mock data.

---

## Project 1 — Department Modules

**Route:** `/settings/department-modules` (the app's default landing page) · **Files:** `pages/settings/department-modules/`

**What a department module is:** a **divider** that splits one account into departments that share the same system but not each other's work. Each department's tickets route to its own divider (a Classic agent never sees IT tickets), keeping views clean — yet work still flows across (a Classic ticket can hand off to IT), and **integrations are shared** (one SIS serves every department).

### 1.1 Department Modules page

This page is where an admin **sees the modules they have, browses available/upcoming ones, and requests new ones**.

#### Data & layout ✅

Modules come from **`ModulesService`** (single source of truth); the page only layers transient request state (`pending`) on top, so cards always match the switcher. Three groups:

- **Active** — what the account owns (`active` modules), plus anything pending (a real module or custom request under review).
- **Available** — released prebuilt modules not yet added (requestable), plus the **Custom module** request card.
- **Coming soon** — unreleased prebuilt modules: a muted preview with a `Coming soon` label and no request button.

**Prebuilt set** (all but custom): **Classic, Transportation, IT, HR, Facilities**. Only **Classic** (Active — the base) and **IT** (Available) are released today; **Transportation, HR, Facilities** show `Coming soon`. A `comingSoon` flag on `Module` drives the split.

#### What's included in each module ✅

`Module.features` is the source of truth for a module's contents — build to these:

| Feature | Classic | IT | Custom |
|---|:--:|:--:|:--:|
| Service desk ticketing | ✓ | ✓ | ✓ |
| Dashboard analytics | ✓ | ✓ | — |
| Workflow automation and routing | ✓ | ✓ | — |
| Asset management | — | ✓ | ✓ |

- **Custom** is intentionally lightweight (ticketing + assets only); **every** custom module shares this exact feature set (`CUSTOM_MODULE_DEFAULTS`). What's chosen per custom module is its **name, icon, and color** — see [Custom module appearance & naming](#custom-module-appearance--naming).
- **Coming soon** modules carry a *planned* feature list (Transportation/HR mirror Classic, Facilities mirrors IT) — **not final**.

#### Custom module appearance & naming

A custom module's *contents* are fixed (ticketing + assets), so its **identity is what the client picks: name, icon, and color.** All three are chosen in the request dialog and rendered exactly like a prebuilt module — a color-tinted tile with a filled glyph on the Department Modules card, and the matching colored glyph in the [switcher](#12-department-switcher-top-nav).

- **Icon** — a preset library of **~30 filled Material Symbols** curated for the K12 district departments that actually run a service desk (weighted toward IT — Help Desk, Devices, Network, Printing, AV, Accounts — then operations, business/admin, student services, and common programs). Always rendered filled, to match the prebuilt modules.
- **Color** — a preset palette of **20 colors**: the **9 design-system accents** reused as-is, plus **11 K12-tailored colors** the DS doesn't ship (gold, lime, cyan, indigo, magenta, clay, coral, mint, slate, sky, maroon). Each extra color is defined once in `src/styles.scss` as app-local custom properties — a soft surface tint (`--module-color-{key}-surface`) + a saturated glyph color (`--module-color-{key}-icon`) — with **light and dark values**, so a custom module themes like everything else.
- **Pickers** — two compact dropdowns (icon, color) sit side by side in the request dialog, with a **live preview** of the card tile + name below. They're fully Angular-controlled popovers (not `ds-select`, since each trigger shows a glyph / color dot rather than text), patterned on the module switcher.
- **The reusable request card stays generic** — the "Custom module" card in *Available* keeps a neutral grey tile + gear icon; the picked icon/color ride onto the **spawned** module, not the request card.
- ⚠️ **DS gap** — the 11 extra colors live outside the design system (app-local custom properties in `styles.scss`). Flag as a DS candidate: promote them into the DS as official accent / module-color tokens at handoff.
- ⛔ **Editing a live module's icon/color/name** after creation isn't built — request-time only for now.

**Data model:** `Module` gains an optional **`color?: ModuleColor`** (`ModuleColor` = the 9 accents + the 11 customs). A module's effective tile/glyph color is **`color ?? accent`** — custom modules set `color`; prebuilt modules keep their `accent`, untouched. `CUSTOM_MODULE_DEFAULTS` carries only the shared copy (tagline + feature set) and the generic request-card look; the per-module icon/color come from the picker.

#### Relationship to the switcher

The switcher ([§1.2](#12-department-switcher-top-nav)) only ever lists **`active`** modules — Available and Coming soon modules never appear there. Whether a user sees the switcher, and which modules, is role-dependent (assigned in **Agent Management** — see [Permissions & role gating](#permissions--role-gating)).

🟡 In the prototype this is driven by the active **persona** (via ⌘K), not an `active` filter — see [Open questions](#open-questions--need-clarification).

#### The request flow ✅ (🟡 persistence mocked)

**Request department module** opens a confirmation dialog:

- **Real module** → confirm → added to `pendingIds`; the card moves to **Active** under an *Under review* overlay.
- **Custom module** → a required **name** + **icon/color pickers** with a live preview → spawns a pending copy carrying the chosen name/icon/color; the reusable card stays in Available. The **name must be unique** — no duplicate of any existing module, prebuilt or custom (case-insensitive); a duplicate shows an inline field error (`is-error` + `role="alert"`) and blocks Send. ⛔ The number of custom requests is **uncapped today**; a cap is coming (how is TBD).
- **Submit** — `Send request` → `Sending...` (~600ms), then a success toast `Request submitted for "[name]".`, or on failure an in-dialog error `Couldn't send your request. Please try again.` (`Send request` retries). Toast system + Shift-to-simulate: [App-wide messaging](#app-wide-messaging).
- 🟡 In-memory only (resets on refresh); the request dialog is a static mock (no focus trap or Escape-to-close).

#### Lifecycle & turning modules on/off ⛔ (in design)

Today: **request → our team sets it up → Active**. Being designed into something more flexible — the goals are set, the specifics still under discussion (see [Open questions](#open-questions--need-clarification)).

- **Goals** — activation won't always be a request (support request / self-serve / trial, swappable); reversible **on/off**; **trials** with easy revert; **removal always possible** (prebuilt or custom).
- **Requirement** — every change must be **reversible and lossless**: turning a module off, ending a trial, or removing it can't lose its data or disturb shared resources (integrations, users), and re-adding it restores the prior state. *How that's built is engineering's call.*
- **Proposed lifecycle (draft)** — `Coming soon → Available → Setting up → Active ⇄ Off → Removed (re-addable)`; `Trial → Keep / End`.

### 1.2 Department switcher (top nav)

**Files:** `components/module-switcher/` · mounted in `ds-top-nav__actions`, gated by `@if (moduleCtx.showSwitcher())`.

#### What it does ✅

The switcher **changes the user's view** — picking a module swaps the whole app (tickets, dashboards, assets, …) into that module. Example: an Agent in **Classic + IT** sees Classic's areas while in Classic; **swap to IT** and they see IT's, including **assets**. It only changes *which* module you're in — *what* you can do there is set by your role/permissions (see [Permissions & role gating](#permissions--role-gating)).

#### When it appears ✅

- **Only for users with more than one module** (assigned in Agent Management). A single-module user (e.g. Agent in IT only) sees **no switcher**.
- **Global admins always see it.**
- **Only `active` modules appear** — never Available/Coming soon.

Prototype rule, against the active persona: `showSwitcher = isGlobalAdmin || availableModules.length > 1`.

#### What it shows ✅

- **Trigger** — the current context: the module's **icon + name** in its color (matching the Department Modules page exactly — same `ModulesService` entry), or a globe + "Global". A **custom module** shows its **chosen icon + color** (effective color = `color ?? accent`), just like a prebuilt one.
- **Menu** — a **Global** row (global admins only); one row per assigned module showing, under the name, the **Agent Management permission set the role maps to** — **Admin → "Department Admin"**, **Agent → "Team Member"** — resolved live from `PermissionSetsService` (the single source) via `MODULE_ROLE_PERMISSION_SET_ID`, not the bare role word (roles can still differ per module — Admin in one, Agent in another); a check on the current one.

#### The Global option (global admins only) ✅

A dedicated **Global** context — global admins only — to **manage all modules across the account** at once. Non-global users never see it.

#### Behavior ✅

- Selecting calls `ModuleContextService.select(...)`, closes the menu, and **re-renders the shell** into the chosen module (can trigger the agent-role redirect off Settings/Analytics).
- **Failed swap** → context stays put; error toast `Couldn't switch to [Module]. Please try again.` with Retry (Shift to simulate). See [App-wide messaging](#app-wide-messaging).
- Open/close: outside-click + Escape. The component holds **no data of its own**.

---

## Project 2 — Agent Management

### Overview — the settings area, its tabs, and how it's wired

**Route:** `/settings/agent-management` · **Files:** `pages/settings/agent-management/` · **Shell:** `AgentManagementComponent`

Agent Management is the settings area for managing the people in an account. The shell (`agent-management.component.*`) owns the page `<h1>Agent Management</h1>` and a `ds-tabs` bar, and renders one of four tabs at a time:

| # | Tab | Internal key | What it is |
|---|---|---|---|
| 1 | **Agents** | `agents` | A table of the user directory → [§2.1](#21-agents-tab) |
| 2 | **Authentication** | `authentication` | 2FA settings → [§2.6](#26-authentication-tab) |
| 3 | **Teams** | `teams` | A table of teams → [§2.4](#24-teams-tab) |
| 4 | **Permission Sets** | `permission-sets` | The [Project 3](#project-3--permission-sets-handed-off-separately) table + editor (lives here) |

- **Tab state** is an in-memory signal (`activeTab`, default `agents`); there is **no per-tab URL**, so a refresh returns to **Agents**.
- **The agent profile is a separate routed page**, not a tab: `/settings/agent-management/:id` → `AgentProfileComponent` ([§2.2](#22-agent-profile)). An Agents-table row click navigates there; the shared `/settings/agent-management` route prefix keeps the Settings subnav item selected.
- **An "agent" is a `User`** — there is no separate Agent type. The Agents tab is a view over `User` records ([§2.7](#27-data-sources)).
- **Who sees it & context scoping** ✅ — Agent Management is reachable by **any admin**: a global admin (in the Global context) and a **department admin** in their own department (`canAdminActions`); agents never see Settings. Its tables are **scoped to the switcher context** (per tab below — a global admin in Global sees everything; a department sees only its own). The shell **re-mounts the active table tab on context change** — `@for (ctx of [moduleCtx.currentModuleId()]; track ctx)` keyed on the module id — so the detached engine re-reads the context-scoped rows.

**Component files:** `agent-management.component.*` (shell) · `agents-tab/` · `agent-profile/` (+ `agent-activity-tab/`) · `agent-form/` · `teams-tab/` · `team-form/` · `authentication-tab/` · `permission-sets-tab/` + `permission-set-editor/` (Project 3) · `form-select.component.ts` (shared control).

#### Tables in this prototype — the `table-init.js` pattern (read once, applies to every table here)

Agent Management is table-heavy (Agents, Teams, Permission Sets, plus the profile's Activity tab). **Every one of these is the canonical Onflo design-system table driven by the global `runtime/table-init.js` engine** (wired in `angular.json`), not a bespoke table. Consequences engineering must know:

- After the table renders, the component calls **`cdr.detach()`** — it hands the DOM to the engine and stops Angular change detection for that component. The rendered rows are a **static snapshot** (refresh re-seeds from the service).
- Because a detached component **can't reactively drive a modal**, the **Create Agent form, Create Team form, and Permission Set editor are hosted on the *parent shell* (which stays attached)**, opened via signals (`creatingAgent`, `creatingTeam` / `editingTeam`, `editingSetId`) that the tabs emit into.
- The engine **binds elements by hard-coded global ids** (`#main-table`, `#btn-filter`, …), so **only one engine table can be mounted at a time** — hence the shell renders one tab at a time, and the profile mounts its Activity table only while that tab is active ([§2.2](#22-agent-profile)).
- Search, sort, filter, column resize/reorder/pin, density, pivot, row groups, context-menu copy, and CSV/Excel export are all the engine's **design-mode DOM simulation** (🟡), not real queries. Every such table carries `<!-- TODO eng: replace with AG Grid + onfloTheme -->`. The shared filter-overlay / column-panel / context-menu **string set is identical across all tables** (boilerplate from the table starter — `Filters`, `Selected Filters`, `Apply Filters`, `Comfort`/`Compact`, `Pin Column`, `CSV Export`, …) and is **not** repeated per table below.

> This is the team's standing rule on embedding `table-init.js` in a tab: **one engine table per rendered view**; multiple per page must be mutually exclusive and re-init on open.

### 2.1 Agents tab

✅ built / 🟡 data in-memory · **Files:** `agents-tab/`

A full-width table of the user directory, rendered with the engine above.

- **Primary CTA:** `Create Agent` (filled, `add` icon) → emits `createAgent`; the shell opens the [Create Agent form](#23-create-and-edit-agent-form).
- **Search:** placeholder `Search agents…`.
- **Columns (in order):** `Name`, `Email`, `Permission Sets`, `Status`, `Module(s)`, `Teams`, `Locations`, `Phone`, `Source`, `Job Title`, `Last Login`, `Date Added`.
- **Permission Sets column** (3rd) — resolves each agent's `permissionSetByModule` values to set **names** via `PermissionSetsService`, de-duplicated, in module order (joined by `, `, or `—` if none). This **replaced the old "Roles" column** and reads the *same* `PermissionSetsService` the profile and the Permission Sets table use — the single-source-of-truth seam ([§3.5](#35-the-single-source-of-truth)).
- **Status cell** — `ds-label` pill with a dot, one of three account states: `Active` (green — has signed-in access), `Pending` (yellow — activation sent, awaiting the agent to activate), `Inactive` (grey — account exists, no access). *(The former `Unverified` state was merged into `Pending`.)*
- **Row click → profile** ✅ — the whole row navigates to `/settings/agent-management/:id`. No per-row kebab / edit / delete menu.
- **Data:** `UsersService.byModule(currentModuleId)` — **scoped to the switcher context**: a global admin in **Global** sees **all** 32 users; scoped into a department (and every department admin) sees only that department's agents (users whose `modules` include it). Re-resolved on context change via the shell re-mount.
- ⛔ Toolbar **Download** button is unwired (`<!-- TODO eng: wire download / export -->`). No paginator (`paginator: false`).
- ⚠️ **ADA:** the clickable `<tr>` is click-only — not keyboard-focusable / `role="button"`. Flag for eng.

### 2.2 Agent profile

✅ built / 🟡 data (Activity tab ⛔) · **Route:** `/settings/agent-management/:id` · **Files:** `agent-profile/` (+ `agent-activity-tab/`)

A full-page profile (it replaced an earlier slide-out drawer). Reads `:id` reactively, so navigating between agents updates in place. On open it collapses the Settings subnav via `chrome.setEditorOpen(true)` (full-area takeover).

- **Heading** — a component-local breadcrumb `Agent Management` › `{name}` (⚠️ DS gap — `<!-- TODO eng: promote to a real ds-breadcrumb -->`, no DS breadcrumb exists yet) + an `ds-sr-only` `<h1>` carrying the name (every page keeps an H1).
- **Hero card** — XL avatar/initials, name, status pill, a source chip (`Manual entry` or `Synced from {source}`), a `{roles} · {location}` subtitle, and an `Edit` button (opens the [Edit Agent form](#23-create-and-edit-agent-form)). When the account is `Pending`, a `Resend activation email` button (icon `forward_to_inbox`) appears beside `Edit` — the yellow status pill is the indicator. It fires a success toast (`Activation email resent to {email}.`); ⛔ `<!-- TODO eng: wire to the real resend-activation endpoint -->`.
- **Three tabs** (`ds-tabs`, default `Details`):

| Tab | Shows | Status |
|---|---|---|
| **Details** | A `Basic Information` card: `User ID` (e.g. `USR-00002`), `First/Middle/Last Name`, `Email`, `Phone`, `Account Status`, `Locations`, `Source`, `Job Title`, `Last Login`, `Date Added`. Synced-locked fields show a `Managed by {source}` note. | ✅ render / 🟡 data; ⛔ `<!-- TODO eng: render the agent's real field set (standard + custom) -->` |
| **Permissions** | One card per module the agent belongs to: that module's `Permission set` (blue pill, `Not assigned` fallback) and a `Teams · {n}` chip group (`Not assigned to any team` empty). Non-agent users get `Non-agent users are not assigned module-level permissions.` | ✅ / 🟡; ⛔ `<!-- TODO eng: link permission sets to the editor -->` (the pill isn't a link) |
| **Activity** | `<app-agent-activity-tab>` — an audit trail (columns `Date`, `Activity`, `Type`, `Details`, `Performed by`). | ⛔ **hard-coded 18-row mock array, not from any service** — `<!-- TODO eng: source from the real audit log -->` |

- **The Activity table hosts the engine** (which binds global ids — see the table note), so it mounts only while its tab is active. It re-inits on open and first clears an orphan `#cp-picker-overlay` the engine leaves on `<body>`. ⛔ `<!-- TODO eng: wire engine teardown -->`.
- **CSV download** 🟡 — the Activity table scrapes the visible DOM into a client-side blob (`agent-activity.csv`); `<!-- TODO eng: wire to the real export endpoint -->`.
- **Full-screen Expand** ✅ — promotes the *same* wrapper to a viewport modal via an `.is-fullscreen` class (never a second table — would collide on global ids); Esc to exit.
- **Unknown id** → `Agent not found` / `This agent may have been removed. Use the breadcrumb above to return to Agent Management.`

### 2.3 Create and Edit Agent form

✅ built / 🟡 submit mocked · **Files:** `agent-form/`

One `ds-modal` component, two modes by the optional `[agent]` input. **Create** is hosted by the shell (opened from the Agents tab); **Edit** is hosted by the profile (opened from the hero `Edit`). Both pre-fill from / map to a `User`.

- **Title / subtitle:** `Create New Agent` / `Add a new agent to the system` — or `Edit Agent` / `Update this agent's information`.
- **Sections & fields:**
  - **Personal Information** — `First Name`*, `Middle Name`, `Last Name`*, `Email Address`*, `Phone Number`, `Employee ID`, `Job Title`, `Locations` (multi-select).
  - **Modules & Access** — repeatable rows of `Department`* (single) + `Permission Set`* (single) + `Teams` (multi), with `Add another department` and a per-row remove.
  - **Custom Fields** — `Office / Room`, `Shift`, `Badge ID` (⛔ hard-coded; `<!-- TODO eng: render from the district custom-field schema -->`).
  - **Activation** (create) — radios `Send activation email` (default) / `Activate user` / `Do not activate` (→ `Pending` / `Active` / `Inactive`); **Account** (edit) — `Account Status` select (`Active` / `Pending` / `Inactive`).
- **Footer:** `Cancel` + `Add Agent` (create) / `Save Changes` (edit).
- **Synced agents** — a `ds-alert--info` banner + locked fields (`Managed by {source}`), driven by `SOURCE_LOCKED_FIELDS`. ✅
- **Submit** 🟡 — `submit()` shows a toast (`Agent created.` / `Agent updated.`) and closes. It does **not** validate or persist; inputs are uncontrolled; there are **no error states**. ⛔ `<!-- TODO eng: wire real submit (validation + persistence), integration field-toggle config, and modal focus trap + return-focus-on-close -->`.
- ⛔ Permission-set / team options are **not** scoped to the chosen department yet (`<!-- TODO eng: scope … to the row's selected department -->`).

### 2.4 Teams tab

✅ built / 🟡 data · **Files:** `teams-tab/`

A table of teams (engine-driven, same pattern). **A team belongs to one module, or is district-wide**
(`Team.module: string | null`; `null` = a **global team**). The table is **scoped to the switcher
context** like Permission Sets: a department shows its own teams (`module === currentModuleId`); the
**Global context shows the global teams** (`module === null`). A team synced from an integration
mapped to several modules is stored **once per module** — same name + members, one record each —
so each surfaces only in its own module's context (the table no longer shows a Module column, since
every visible row already belongs to the current context).

- **CTA:** `Create Team` → emits `createTeam`; the shell opens the [Team form](#25-create-and-edit-team-form). **Search:** `Search teams…`.
- **Columns:** `Team Name`, `Agents` (this is `memberIds.length` — labeled Agents), `Permission Set` (resolved name or `None`), `Source` (`Manual` / `Active Directory` / `Azure` / `Google`), `Last Updated` (`Team.updatedAt`, an ISO timestamp rendered via the date pipe — a synced pair shares one timestamp).
- **Per-row action:** a row click emits `editTeam` (bound at initial render so it survives the engine's `cdr.detach()`); the shell opens the [Team form](#25-create-and-edit-team-form) — editable for `Manual` teams, **read-only** for synced ones. ⛔ Download unwired.
- **Data:** `TeamsService.teams()` (11 seed rows: 5 single-module teams + 2 synced teams that each span two modules as a pair of module-specific rows — `District Service Desk` via Google, `Support` via Azure — + 2 **global** teams (`module: null`): `District Leadership`, `Emergency Response Team`).

### 2.5 Create and Edit Team form

✅ built / 🟡 submit mocked · **Files:** `team-form/`

A `ds-modal` hosted on the shell with **three modes**, driven by the optional `[team]` input
(mirrors the Agent form):

- **Create** (no `team`) — title `Create New Team`; `Team Name`, `Permission Set`, and `Members` are editable. **No Department field** — a new team's module is the current switcher context (Global → a global team, `module: null`), the same context-scoping the Teams table and permission sets use.
- **Edit, manual** (`team.source === 'Manual'`) — title `Edit Team`; pre-filled and editable.
- **Edit, synced** (`team.source !== 'Manual'`) — title `Team Details`; **fully read-only**: a `ds-alert--info` "synced from {source}" banner, disabled fields, members as static `ds-tag` chips, and a single `Close` button (no Save). Synced teams are owned by their integration and edited in Integration Hub, not here.

- **Fields:** `Team Name`* (text), `Permission Set` (single), and a `Members` field. **Members render as chips** — the real agents on the team (the same `memberIds` the table's Agents column counts): **read-only** on a synced team, **removable** (× per chip) on a manual/new team, shown below a `Search users to add…` field. 🟡 Remove is a visual stand-in (resets on reopen) and the search is non-functional (⛔ `<!-- TODO eng: wire user search + real add/remove -->`). **No Department field in any mode** — a team's `module` is the current switcher context (Global → a global team), set on create and preserved on edit, never picked in this form.
- **Footer:** synced → `Close`; otherwise `Cancel` + `Add Team` (create) / `Save Changes` (edit).
- **Submit** 🟡 — toast (`Team created.` / `Team updated.`) + close; does **not** validate or call `TeamsService.add()` / `.update()`. ⛔ `<!-- TODO eng: validate + persist; link the synced banner to Integration Hub -->`.

### 2.6 Authentication tab

🟡 mocked · **Files:** `authentication-tab/`

A single settings panel for **Two-Factor Authentication only** — no SSO, no provider config.

- Section title `Two Factor Authentication (2FA)`, an intro line, a `ds-toggle` (label flips `2FA Enabled` / `2FA Disabled`, default **off**), and three static help sections: `What Is Two Factor Authentication?`, `How Is Two Factor Authentication Helpful?`, `What Happens When Two Factor Authentication Is Turned On?`.
- The toggle flips a local signal only — **not persisted**. ⛔ `<!-- TODO eng: wire 2FA enable/disable -->`.

### 2.7 Data sources

Agent Management reads four singleton, signal-backed services (all 🟡 in-memory; all dates are static ISO strings, never `new Date()`):

| Service | Provides | Mutators | Notes |
|---|---|---|---|
| `UsersService` | `users()` — 32 seed users across all modules | `add`, `update`, `remove`, `byModule` | **SSOT for `User`**. The Create/Edit Agent form *would* call `add`/`update` on handoff (today it's mocked). |
| `TeamsService` | `teams()` — 11 seed teams | `add`, `update`, `remove`, `byModule` | **SSOT for `Team`**. User↔team links are **bidirectional** in seed data (`User.teams` ⟷ `Team.memberIds`). A team has one `module`, **or `null` for a global (district-wide) team**; integration-synced teams spanning modules are one record per module. |
| `TicketsService` | `tickets()` — 40 seed tickets | `byModule` only | **SSOT for `Ticket`**; **read-only** (no add/update/remove). ⚠️ Tickets key their owner by **`ownerName` string, not id**. Flag for eng. |
| `PermissionSetsService` | see [Project 3](#project-3--permission-sets-handed-off-separately) | `add`, `update`, `remove` | The permission-set SSOT. |

**Key model shapes** (`models.ts`):

- **`User`** — `id`, `firstName`, `middleName?`, `lastName`, `email`, `phone?`, `status` (`UserStatus`), `source` (`UserSource`), `roles` (`UserRole[]`), `modules` (module ids), `teams` (team ids), `locations`, `grade?`, `jobTitle?`, `employeeId?`, `pronouns?`, `emergencyContact?`, **`permissionSetByModule: Record<moduleId, permissionSetId>`**, `lastLogin?`, `dateAdded`. Helper `fullName(u)`; `SOURCE_LOCKED_FIELDS` lists which fields a synced source locks (`SIS` / `Active Directory` / `Google` / `Azure` lock `firstName, lastName, email, status`; `Manual` locks none).
- **`Team`** — `id`, `name`, `module` (one module id, **or `null` for a global team**), `memberIds` (user ids), `permissionSetId?`, `source` (`TeamSource`).
- **`Ticket`** — `id`, `number`, `subject`, `description`, `customerName`, `customerRole`, `priority` (`P1`–`P3`), `status` (`Unopened` / `In Progress` / `Waiting` / `Closed`), `ownerName`, `moduleId`, `receivedAt`, `isMyTicket`, `isMyTeam`.

**Shared form control** — `form-select.component.ts` (`app-form-select`) is a presentational wrapper that emits canonical `ds-select` markup so the global `runtime/select.js` drives it (single / multi / select-all). It owns no state; the host reads the DOM at submit. Used by both forms. ⛔ `<!-- TODO eng: replace with a reactive ds-select bound to the form model -->`.

---

## Project 3 — Permission Sets (handed off separately)

> **Permission Sets was handed off to engineering earlier as its own design.** This section is the
> **boundary**: what it is, its data model, and — most importantly — **how it wires into the rest of the
> app**. The UI physically lives inside Agent Management (`agent-management/permission-sets-tab/` +
> `permission-set-editor/`), but it is a separate deliverable.

### 3.1 What it is

A catalog of **permission sets** — named capability bundles assigned to agents (per module) and teams. Two views of it live in Agent Management: a **table** of all sets, and a full-area **editor** for one set.

### 3.2 Data model

`PermissionSet` (in `models.ts`):

```
{ id; name; moduleId: string | null;                 // null = system-wide, else a module id
  type: 'System' | 'Custom'; isLocked: boolean;
  isGlobalOnly?: boolean;                             // global-tier: Global Admin + any set created in the Global context
  description?; departments?; allDepartments?;        // editor Details tab (description + scope)
  assignedUserIds?; assignedTeamIds?;                 // editor Details tab (assigned users/teams)
  capabilities: Record<string, boolean | string>;    // perm id → toggle bool or segment value
  updatedAt }                                         // ISO timestamp; stamped on create/update
```

**8 seed sets** in `PermissionSetsService`:

| id | name | type | module | locked |
|---|---|---|---|:--:|
| `ps-sysadmin` | Global Admin | System | — | ✓ |
| `ps-dept-admin` | Department Admin | System | — | ✓ |
| `ps-global-user` | Global User | System | — | ✓ |
| `ps-team-member` | Team Member | System | — | |
| `ps-recorder` | Recorder | System | — | |
| `ps-readonly` | Read Only | System | — | |
| `ps-it-desk-lead` | IT Desk Lead | Custom | `it` | |
| `ps-classic-triage` | Classic Triage | Custom | `classic` | |

- A set is **read-only when `isLocked || type === 'System'`** — so *all six* System sets open read-only, even the three with `isLocked: false`.
- **`Global Admin`** (renamed from *System Administrator*; id `ps-sysadmin` unchanged so `permissionSetByModule` refs don't break) carries **`isGlobalOnly: true`** — the global-tier admin set, shown only in the Global context. **`Department Admin`** (`ps-dept-admin`) is the department-tier admin set. The department switcher resolves a module role to one of these via `MODULE_ROLE_PERMISSION_SET_ID` (`Admin → ps-dept-admin`, `Agent → ps-team-member`).
- **Global-tier sets** (`isGlobalOnly: true`) list only in the Global switcher context, and their editor exposes only global settings — never department-scoped config. Beyond the seeded `Global Admin`, **any set created while in the Global context** is marked `isGlobalOnly` (the New Permission Set modal sets it; the editor's Duplicate carries it).
- The **full permission catalog** lives in **`permission-catalog.ts`**: two `PermissionSection[]` arrays — **`ACTIONS_SECTIONS`** (Tickets, Assets, Analytics, Campaigns) and **`SETTINGS_SECTIONS`** (Global, Tickets, Assets, Automations, Integrations), **105 perms total**, ported faithfully from the Figma Make source. Tickets & Assets appear in BOTH (action toggles vs admin segments). **`ROLE_PRESET_STATES`** (keyed by role name; mapped from a set id via `SET_ROLE_PRESET`) is the read-only configuration each system set renders with. `PermissionSetsService` exposes `actionsSections` / `settingsSections`. Each section/perm may carry a **`tier: 'global' | 'department'`** tag (omitted = `department`); **`globalTierSections()`** narrows a catalog to its global-tier sections/perms — what a global-tier set's editor renders (over `ACTIONS_SECTIONS` → empty, so the Actions tab is hidden; over `SETTINGS_SECTIONS` → Global only, minus the department-scoped **Department Locations** row).
- Methods: `add`, `update`, `remove` — `add` and `update` stamp `updatedAt` with the current time (backs the table's Last Updated column). ⚠️ **`remove()` has no caller — there is no delete UI.**

### 3.3 Permission Sets tab

✅ built / 🟡 data · **Files:** `permission-sets-tab/`

Engine-driven table.

- **CTA:** `Create permission set` → opens the **New Permission Set modal** (`create-permission-set-modal/`): name, description, a context-locked **Department** (Global → "Global"), and an optional **Copy From** (seeds capabilities from an existing set). On Create it adds the set (scoped to the switcher context — **a set created in the Global context is marked `isGlobalOnly`**, making it a global-tier set) and opens its editor. 🟡
- **Search:** `Search permission sets…`. **Columns:** `Name`, `Type` (`System` blue / `Custom` grey badge), `Agents` (count of agents assigned the set, scoped to the current context — in a department, agents whose set *for that module* is this one; in Global, agents holding the global-only set in any module), `Last Updated` (`PermissionSet.updatedAt`, rendered via the date pipe). *(`Scope` and `Status` columns were removed.)*
- **Scoped to the switcher context** ✅ (like Teams): the **Global context** shows only the **global-tier** set (`Global Admin`, `isGlobalOnly`); a **department** shows the department-tier system-wide sets + only that department's own custom sets, and **hides `Global Admin`**. Re-mounts on context change.
- **Whole row → editor** ✅ (`aria-label="Open {name}"`). No kebab menu.

### 3.4 Permission Set editor

✅ built / 🟡 save in-memory · **Files:** `permission-set-editor/` (shell + state service + four tab components)

Opens **full-area, replacing the tab bar** (driven by the shell's `editingSetId`; the parent stays attached — reactive). Collapses the subnav via `chrome.setEditorOpen`. **A faithful port of the Figma Make config flow.**

- **Shell** (`permission-set-editor.component`, `ViewEncapsulation.None` so its stylesheet styles the tab sub-components) — the back-affordance, set name (+ a `System` badge when read-only), and **tab bar all live in the *page heading*** (`agent-management.component`: breadcrumb + `<h1>` + a `ds-tabs` row the parent owns via `editorTab` / `editorTabs`), not in the editor card; **Save Changes / Discard** are a **bottom save bar** (`chrome.saveBar`, shown while `state.dirty()` — which now includes buffered assignment edits, so it can appear for read-only system sets when their members change). Tabs are **Details · Data Visibility · Actions · Settings** — except **global-tier sets (`isGlobalOnly`) show only Details + Settings** (Data Visibility + Actions are dropped from the `editorTabs` computed). The amber read-only banner (system sets) renders inside each scrollable tab. Reloads when `[setId]` changes (so Duplicate → open works). Provides the per-editor **`PermissionEditorStateService`** every tab reads/writes.
- **State service** — working name/description/capabilities/data-visibility/assignments + mutators (`setToggle`, `setSegment`, `applyPreset`, scope/filter setters, `applyAssignments`/`removeUser`/`removeTeam`) and a public `setId` signal. On load, **assignments seed from live data** (who holds the set via `permissionSetByModule` + teams via `Team.permissionSetId`, context-scoped), so the editor opens matching the table. System sets seed read-only from `ROLE_PRESET_STATES`; catalog-keyed custom sets clone verbatim; brand-new sets default. `dirty` = working state ≠ load-time baseline (so assignment edits flip it even on read-only sets). `save()` flushes assignments to `PermissionSetsService` **always**, and name/description/capabilities only on editable sets.
- **Details tab** (`pset-details-tab`) — name + description, and **Assigned Users & Teams**. The list is **derived from live data** so it always matches the table's Agents count: **Users** = agents holding this set via `permissionSetByModule`, scoped to the current switcher context (the same derivation the Permission Sets table's Agents column uses); **Teams** = teams whose `permissionSetId` is this set (context-scoped, like the Teams table). Members render as **removable chips** (`ds-tag`, the same chip style as the team modal) inside a card on `--color-surface-page`; counts + an **Add Assignment** modal (`assign-members-modal`, searchable `UsersService` / `TeamsService` list). **Add/Remove are buffered edits** — the chip × removes immediately (no confirm) and Add appends; both make the editor `dirty` and are committed on **Save Changes** / reverted on **Discard**. 🟡 In design mode they don't truly persist (reopen re-seeds from live data — `⛔ TODO eng: real add/remove`).
- **Data Visibility tab** (`pset-data-visibility-tab`) — Tickets + Assets record scopes (All / Assigned), plus the Assets **filter builder**: three reactive multiselects (Asset Type / Assigned User Type / Grade), each with an **Exclude** toggle + live helper text ("User can only see / cannot see assets …"). **Hidden for global-tier sets** — a global set has no department tickets/assets to scope.
- **Actions & Settings tabs** — both render the shared **`pset-matrix-tab`** (left section nav + search, right perm grid), fed `ACTIONS_SECTIONS` / `SETTINGS_SECTIONS`. Each row is a **toggle** or **segment** (`Hide`/`View`/`Manage`, or `…/Edit`); a `Manage` segment reveals sub-checkboxes (`Create`/`Edit`/`Delete`, or custom — Archived Assets → `Recover`/`Permanently Delete`). Per-section bulk **presets** (`No Access` / `View Only` / `Full Access` / `Custom`; Actions Tickets/Assets omit View Only). A child perm gates on a parent via `disabledByKey`; sub-groups collapse. **Global-tier sets:** the **Actions tab is hidden** and **Settings shows only the Global section** — both via `globalTierSections()` (Actions has no global-tier sections; the Settings Global section is now all global-tier, so it shows in full). The matrix component itself is unchanged; it just receives a smaller `sections` array.
- **Save** 🟡 — in-memory (`setsSvc.update`), with the project's **snackbar pattern** (`MessagingService`): a **success** toast on save (`Permission set saved.`) and an **error** toast when an editable set's name is blank (`Enter a permission set name before saving.`, blocks the save). **Duplicate** (system sets) → a `{name} (copy)` Custom set, opened editable.
- ⚠️ **Capability vocabulary.** Seed sets store a *legacy* vocabulary (`manageUsers`, `ticketAccess`, …); the editor seeds system sets from `ROLE_PRESET_STATES` and rewrites `capabilities` into catalog ids (`tk-*`, `as-*`, `gl-*`, …) on save.

### 3.5 The single source of truth

`PermissionSetsService.sets()` is the one dataset. Sets are referenced **by id** everywhere — agents via `User.permissionSetByModule` (module → set id), teams via `Team.permissionSetId` — and read by eight surfaces (most resolve a set id back to its **name**; the editor's assigned list reads the reverse — who holds the set):

| Surface | Reads | Resolves to |
|---|---|---|
| Agents table **Permission Sets** column ([§2.1](#21-agents-tab)) | `user.permissionSetByModule` | set names (joined) |
| Agent profile **Permissions** tab ([§2.2](#22-agent-profile)) | `user.permissionSetByModule[moduleId]` | set name per module (`Not assigned` fallback) |
| Create/Edit **Agent form** ([§2.3](#23-create-and-edit-agent-form)) | `sets()` | per-row dropdown options |
| Teams table **Permission Set** column ([§2.4](#24-teams-tab)) | `team.permissionSetId` | set name (`None` fallback) |
| Create **Team form** ([§2.5](#25-create-and-edit-team-form)) | `sets()` | dropdown options |
| **Permission Set editor** ([§3.4](#34-permission-set-editor)) | `sets()` | the **one writer** (`add` / `update`) |
| **Permission Set editor — Assigned Users & Teams** ([§3.4](#34-permission-set-editor)) | `user.permissionSetByModule` + `team.permissionSetId` (reverse — who holds the set) | the agents/teams on the set; matches the table's Agents count |
| Department **switcher** role label ([§1.2](#12-department-switcher-top-nav)) | `sets()` via `MODULE_ROLE_PERMISSION_SET_ID` | role → set name (`Department Admin` / `Team Member`) |

So all eight stay wired to one dataset; the editor is the only writer; there is no delete. (Structural aside: `ChromeService.setEditorOpen` is the shared mechanism the editor and the agent profile both use to collapse the subnav during a full-area takeover.)

### 3.6 Settings permissions ↔ the product Settings nav

⛔ spec — the contract eng wires; not active in the prototype yet

The **Settings** tab's catalog (`SETTINGS_SECTIONS`, `permission-catalog.ts`) is the permission mirror of the product's **Settings sidebar nav** (`app.ts` `_settingsItems`): the same six sections (Global · Integration Hub · Automations · Tickets · Assets · Call Center), in the same order, with **one permission per settings item**. The granted level on a permission **gates that item in a holder's Settings nav**:

- **Hide** → the item (and its page) is not rendered in Settings for anyone holding the set.
- **View** → the item is visible, read-only.
- **Manage / Edit** → the item is visible and editable.

A sub-group gates as a unit — e.g. setting **Topic Manager** (its `Topics` + `Success Messages` perms) to **Hide** removes the whole *Topic Manager* group from that user's Settings nav.

The two lists must stay in lockstep: **add or rename a settings nav item ⇒ add or rename the matching permission**, and vice versa, so the mapping stays 1:1. In the prototype the Settings sidebar is static (only Department Modules + Agent Management are live pages) and the set is mocked, so nothing hides today — this is the intended engineering contract. `<!-- TODO eng: gate each settings nav item on the active set's SETTINGS_SECTIONS value -->`

**Parity status:** all six sections now mirror the settings nav 1:1. To get there: Custom Fields was **added to the nav** (▸ Field Library / Visibility Rules) to match the catalog; Integration Hub was rebuilt to the nav's **API Tokens / Webhooks / Marketplace / Installed Apps** (the old SchoolCash Fee / Parts Catalogue rows were **dropped**); Workflows was renamed **Automations** and split into **Legacy Workflows / Workflows / Lookup Tables**; and Global gained **District Profile, Department Modules, Agent Management, Labels**, the **Activity Log** Onflo/Assets split, and **Locations** as Physical Locations / Containers / Configurations (replacing Global / Department Locations). The system-set seed presets (`ROLE_PRESET_STATES`) were refreshed in lockstep, so all five prebuilt sets (Global Admin / Global User / Team Member / Recorder / Read Only) carry the renamed and new Settings perms at their intended level — catalog perm ids and preset keys are now a 1:1 match, so no Settings permission silently defaults to `Hide` on a system set.

---

## Status summary — what's left to wire

**Shared foundation**

| Area | Status | Note |
|---|---|---|
| Module context model + nav/Settings gating | ✅ / 🟡 | Derived from the active persona via `ModuleContextService` |
| Integration Hub access (global-only + per-dept grants) | ✅ / 🟡 | Visibility via `IntegrationsService`; Marketplace assignment UI is the Integrations team's |
| App-wide messaging (success/error toasts) | ✅ | Shared `MessagingService` + top-center snackbar |
| Theme (light/dark, persisted) | ✅ | |
| Persona swapper (⌘K) | ✅ / 🟡 | Demo stand-in for the signed-in user |
| Session / timeout messaging | ⛔ | None today |
| Real auth replacing `PersonaService` | ⛔ | |

**Project 1 — Department Modules**

| Area | Status | Note |
|---|---|---|
| Module catalog + Active/Available/Coming soon | ✅ | SSOT = `ModulesService` |
| Module request flow (incl. custom) | ✅ / 🟡 | Loading + success toast + in-dialog error; unique-name validation; in-memory only |
| Custom module appearance (name + icon + color) | ✅ / 🟡 | ~30-icon library + 20-color palette + live preview; the 11 extra colors are app-local (DS-promotion candidate) |
| Switcher (visibility, contents, role labels, swap) | ✅ | Derived from the active persona |
| Switcher shows only `active` modules | ⛔ | Prototype is persona-driven (see Open questions) |
| Module lifecycle (on/off, trial, remove) | ⛔ | In design — pending decisions |
| Request persistence + real submission | ⛔ | In-memory only |
| Request dialog focus trap + Escape-to-close | ⛔ | Static mock |

**Project 2 — Agent Management**

| Area | Status | Note |
|---|---|---|
| Agents / Teams tables (render, search, sort, filter via engine) | ✅ / 🟡 | `table-init.js` DOM simulation; replace with AG Grid |
| Agents table Permission Sets column | ✅ | Resolves the shared `PermissionSetsService` |
| Agent profile (Details / Permissions) | ✅ / 🟡 | Live off in-memory services |
| Agent profile **Activity** tab | ⛔ | Hard-coded 18-row mock — needs a real audit log |
| Create/Edit Agent + Create/Edit Team forms | ✅ / 🟡 | Open/close/pre-fill built; **submit is a toast** — no validation, no persistence |
| Authentication (2FA) | 🟡 | Toggle not persisted; no SSO |
| CSV export (profile Activity table) | 🟡 | Client-side DOM scrape; wire to real endpoint |
| Form focus trap / return-focus | ⛔ | Not built |
| Custom fields from a real schema | ⛔ | Hard-coded today |

**Project 3 — Permission Sets** *(handed off separately)*

| Area | Status | Note |
|---|---|---|
| Permission Sets table + full-area editor | ✅ / 🟡 | Create/edit in-memory |
| Single-source-of-truth wiring (6 surfaces) | ✅ | One dataset, resolved by id everywhere; editor is the only writer |
| Capability vocabulary | ⚠️ / ⛔ | Seed sets use legacy keys; editor rewrites to catalog vocab on save — needs a real schema + migration |
| Manage → Create/Edit/Delete sub-permissions | ⛔ | Local UI only, not persisted |
| Data Visibility filter builder | ⛔ | Bespoke stub — `TODO eng` |
| Delete a permission set | ⛔ | `remove()` exists, no UI |

---

## Open questions — need clarification

1. **Switcher vs. active modules (prototype mismatch).** The rule is "the switcher shows only `active` modules," but the demo personas are assigned to modules that aren't active (IT, Transportation, HR, Facilities), so the rule isn't demonstrable as-is. Resolving it depends on the persona/assignment model.
2. **Module lifecycle** (in design — being reviewed with product/manager): Is **"off"** a distinct paused state, or just **remove**? When a **trial ends** un-kept, does its data **come back** if the module is re-added later, or is it **cleared**? Which modules use which **activation method** (request / self-serve / trial)?
3. **Custom-module request cap.** Uncapped today; a cap is planned — the rule is TBD.
4. **Permission model & capability schema** (Project 3). The real permission catalog is owned by the Permission Sets handoff; the prototype ships a representative subset with a **legacy ↔ catalog vocabulary mismatch** (sets are rewritten on save). Eng needs to define the production capability schema and a migration for existing sets. The exact nav/Settings gating (Assets-by-module, per-area Settings, Global = global-admins-only) and per-module roles map onto this model.
5. **Agent activity / audit log.** The profile's Activity tab is a hard-coded mock — it needs a real per-agent audit-log source and schema.
6. **Custom fields.** The agent form's custom fields are hard-coded; production needs the district custom-field schema (and the integration-driven on/off toggling of fields).
