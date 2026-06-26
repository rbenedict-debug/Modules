# Engineering Architecture — Onflo Modules Prototype

**Date:** 2026-06-26 · **Branch:** `main` · **Status:** Draft for engineering handoff

> The single technical reference for the Onflo Modules prototype: **three projects** that ship to
> engineering separately but share one spine — **Department Modules** ([P1](#project-1--department-modules)),
> **Agent Management** ([P2](#project-2--agent-management)), and **Permission Sets**
> ([P3](#project-3--permission-sets-handed-off-separately)). Read [System overview](#system-overview--how-the-three-projects-fit-together)
> + [Shared foundation](#shared-foundation) first, then your project. Open decisions are at the [end](#open-questions--need-clarification).

---

## How to read this doc

This is a **design-mode prototype** — a clickable Angular mock-up, no backend yet.

- **UI is real and exact.** Every label, message, character limit, empty state, and toast below is copied verbatim from the built UI. A string in `code font` (e.g. `Agent created.`) is the literal string in the prototype's code today.
- **Backend is not built.** Persistence, real failures, live permission enforcement, module activation, audit logging — none exist. Where the intended behavior is known it's flagged 🟡 (mocked) or ⛔ (planned) per the [status legend](#status-legend).

---

## System overview — how the three projects fit together

Three projects on one shared spine: one defines *what modules exist*, one assigns *who gets what*, one defines *the capability bundles* assignment hands out.

| Project | Owns | Route(s) | Handoff |
|---|---|---|---|
| **1 · Department Modules** | Module catalog, top-nav **switcher**, module-context gating | `/settings/department-modules` | [Project 1](#project-1--department-modules) |
| **2 · Agent Management** | **Agents**, **Teams**, **Authentication**, and the UI hosting Permission Sets | `/settings/agent-management(/:id)` | [Project 2](#project-2--agent-management) |
| **3 · Permission Sets** | Permission-set **catalog + editor**; per-module permission model | *(inside Agent Management)* | **Already handed off**; [Project 3](#project-3--permission-sets-handed-off-separately) |

**The shared spine** (all in `src/app/data/`):

- **`ModulesService`** — SSOT for the module catalog (P1 owns; everything reads).
- **`ModuleContextService`** — derives the *current view* (which module you're in, your role, what nav/Settings you see) from the active persona. The seam between every project.
- **`PersonaService`** — demo stand-in for the signed-in user + their assignments (swapped via ⌘K). Production: the real authenticated user.
- **Per-module permission model** — a user holds a set *per module* (`User.permissionSetByModule`); a team holds one (`Team.permissionSetId`); both point at `PermissionSetsService`.

**Data flow:** Department Modules defines modules → Agent Management assigns who gets which module/role/team/set → `ModuleContextService` + switcher render what each user sees. Permission Sets defines the capability bundles. Everything resolves to singleton services, so catalog, switcher, tables, and profile never disagree.

> Terminology: the old **"User Management"** is now **Agent Management** (P2). **Permission Sets** (P3) was split out and handed off separately.

---

## Shared foundation

### Status legend

| | Meaning |
|---|---|
| ✅ | **Built** and working |
| 🟡 | **Mocked** — works, but static / in-memory (resets on refresh) |
| ⛔ | **Planned** — not built |

### Where things live

**Data & state (`src/app/data/`) — the spine + every SSOT:**

| File | Role |
|---|---|
| `models.ts` | Shared interfaces (`User`, `Team`, `PermissionSet`, `Ticket`, `Module`, `Persona`, …) + helpers (`fullName`, `SOURCE_LOCKED_FIELDS`, `moduleCapabilities`, `CUSTOM_MODULE_DEFAULTS`) |
| `modules.service.ts` | **SSOT** — module catalog |
| `persona.service.ts` | Demo personas + active one (⌘K stand-in) |
| `module-context.service.ts` | Derives the view (module access, switcher, nav/Settings gating) |
| `users.service.ts` | **SSOT** — users/agents (32 seed) |
| `teams.service.ts` | **SSOT** — teams (11 seed) |
| `tickets.service.ts` | **SSOT** — tickets (40 seed; read-only) |
| `permission-sets.service.ts` | **SSOT** — permission sets (8 seed) + the permission **catalog** |
| `integrations.service.ts` | Mocked integration grants (`managerModuleIds`) |
| `messaging.service.ts` | App-wide toast service |
| `chrome.service.ts` | Subnav open/collapse + save-bar state (`setEditorOpen` for full-area takeovers) |

**Shell & shared components:** `app.{ts,html,routes.ts}` (routing, nav gating, theme) · `components/module-switcher/` (P1) · `components/command-palette/` (⌘K) · `components/snackbar-host/` (toast host).

**Pages (`src/app/pages/settings/`):** `department-modules/` (P1) · `agent-management/` (P2 shell + tabs, and the P3 UI).

### Module context model

`ModuleContextService` takes the active persona and derives **which module you're in** (or Global) + **your role** (`Admin`/`Agent`), and **what's visible** (switcher, side nav, Settings — see [Permissions & role gating](#permissions--role-gating)). 🟡 Persona-driven via ⌘K, not real auth.

### Permissions & role gating

*The seam between P1 and P2: Agent Management assigns access; `ModuleContextService` renders it.* What a user is assigned (modules, role per module, permission set) changes what's visible:

- **Side nav** — **Assets** shows only in a module with Asset management; **Analytics** only with Dashboard analytics and hidden for agents; **Settings** hidden for agents.
- **Inside Settings** — each section is gated by context + capability:
  - **Global** (district-wide, `isGlobal` only — a global admin loses it when scoping into a module; department admins never see it): District Profile, AI Training Resources, Custom Fields (Field Library / Visibility Rules), Department Modules, Labels, Languages, Locations (Physical / Containers / Configurations), Portal Branding. (`department-modules` is also Global-only at the route level.)
  - **General** (department-tier; header shows for **any admin** via `isGlobal || canAdminActions`): Activity Log, Agent Management, Chatbot, Communications, Keyword Alerts, Live Agent, Tags. A department admin sees their own dept's General settings; a global admin sees it in Global context too. `agent-management` lives here and is reachable by department admins.
  - **Integration Hub** — district-level like Global (Global context only), with a per-department grant exception — see [Integration Hub access](#integration-hub-access).
  - **Automations** — needs the module's workflow capability. **Tickets** — every admin. **Assets** — needs Asset management. **Call Center** — district-level (Global context only).

The Settings nav (`app.ts` `_settingsItems`) and the Permission-Sets catalog (`SETTINGS_SECTIONS`) are kept **1:1** — see [§3.6](#36-settings-permissions--the-product-settings-nav). Visibility derives from the active persona via `ModuleContextService` (capabilities from `Module.features`; integration grants from `IntegrationsService`).

**How assignment is authored.** `User.permissionSetByModule` (module id → set id) and `Team.permissionSetId` are authored in **Agent Management** and resolved against **Permission Sets**.

#### Integration Hub access

**Owned by a separate team** — this prototype demos only the *access* behavior.

- **Default** — district-level like Global: visible only in the **Global context**.
- **Grant** — in the **Marketplace** (global-admins-only) a global admin assigns department modules as **managers** of specific integrations.
- **Granted department's view** — a scoped Integration Hub: only its **Installed Apps**, never the district tools (API Tokens, Webhooks, Marketplace).
- **Wiring** — grants mocked in `IntegrationsService` (`Integration.managerModuleIds`); `ModuleContextService.canSeeIntegrations` / `managedIntegrations` derive visibility. Demo: **HR is granted DocuSign + BambooHR**, so **Linda** (HR admin) sees the scoped hub.
- ⛔ Marketplace assignment UI is the Integrations team's.

### App-wide messaging

One toast system — `MessagingService` → a single top-center `SnackbarHostComponent`.

- **Success** — top-center, auto-dismiss 3s, manual ×.
- **Error** — error icon + **Retry** + Dismiss; **never auto-dismisses**.
- **In-modal failures** — a `ds-alert--error` at the top of the dialog (stays open; primary button retries).
- **Demo:** mock actions always succeed, so **hold Shift while clicking** simulates failure.
- ⚠️ DS gap — no DS snackbar error variant (failures reuse the text-action shell + tinted icon). ⛔ Production: drive from the real result.

### Form validation

Every create/edit form validates **required fields on submit** — errors hidden until the primary action is clicked. On invalid submit the form **doesn't close or toast**: it surfaces errors, focuses the first invalid control, and clears each error reactively as fixed. ✅ (🟡 submit itself stays mocked.)

- **Field** — wrapper gets `is-error`, label keeps `*`, control gets `aria-invalid` + `aria-describedby`, message in a `ds-…__helper` with `role="alert"` (inputs/selects show the filled `error` icon). `app-form-select` has `[error]` / `errorMessage` for required selects.
- **Modal summary** — `ds-alert--error` at the top of `ds-modal__body`. (The single-field Department-Modules dialog is the exception — its field error *is* the summary.)
- **Save-bar summary** — the Permission Set editor (full-area, not modal) flips its docked save bar to `ds-save-bar--error` and switches to Details + focuses the field; reverts the instant it's valid.
- **Rules:** required text → non-empty; required select → a choice; **Email** → required + `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`; **Phone** → optional, format-checked when filled (⛔ `TODO eng: libphonenumber`).

### Session and timeout messaging ⛔

No session/idle/auth-timeout handling yet. (Existing `setTimeout`s are UI timing only.) Placeholder for session-expiry, request timeouts, retry-on-timeout.

### Persona swapper (⌘K)

⌘K / Ctrl+K (`components/command-palette/`) swaps the active `PersonaService` persona, re-deriving `ModuleContextService` and re-rendering the shell. A **demo instrument, not a feature** — production replaces it with the signed-in user. ✅ built / 🟡 personas are mock data.

---

## Project 1 — Department Modules

**Route:** `/settings/department-modules` (default landing) · **Files:** `pages/settings/department-modules/`

**A department module** is a **divider** splitting one account into departments that share the system but not each other's work — tickets route to their own divider (a Classic agent never sees IT tickets), yet work can hand off across, and **integrations are shared** (one SIS serves all).

### 1.1 Department Modules page

Where an admin sees their modules, browses available/upcoming ones, and requests new ones.

#### Data & layout ✅

Modules come from **`ModulesService`** (SSOT); the page layers transient `pending` state on top. Three groups:

- **Active** — owned (`active`) modules + anything pending.
- **Available** — released prebuilt modules not yet added (requestable) + the **Custom module** request card.
- **Coming soon** — unreleased prebuilt: muted preview, `Coming soon` label, no request button.

**Prebuilt set:** Classic, Transportation, IT, HR, Facilities. Released today: **Classic** (Active, base) + **IT** (Available); the rest are `Coming soon` (a `comingSoon` flag drives the split).

#### What's included in each module ✅

`Module.features` is the SSOT for contents:

| Feature | Classic | IT | Custom |
|---|:--:|:--:|:--:|
| Service desk ticketing | ✓ | ✓ | ✓ |
| Dashboard analytics | ✓ | ✓ | — |
| Workflow automation | ✓ | ✓ | — |
| Asset management | — | ✓ | ✓ |

- **Custom** is fixed at ticketing + assets (`CUSTOM_MODULE_DEFAULTS`); only its name/icon/color are chosen.
- **Coming soon** modules carry a *planned* (non-final) feature list.

#### Custom module appearance & naming

A custom module's contents are fixed, so its **identity = name + icon + color**, all picked in the request dialog and rendered like a prebuilt module (tinted tile + filled glyph on the card and in the switcher).

- **Icon** — preset library of **~30 filled Material Symbols** curated for K12 service-desk departments. Always filled.
- **Color** — preset palette of **20 colors**: the 9 DS accents + 11 K12 customs the DS doesn't ship. Each custom is defined once in `src/styles.scss` as app-local custom properties (surface tint + glyph color, light + dark).
- **Pickers** — two Angular-controlled popover dropdowns (icon, color) with a live card preview (not `ds-select`, since triggers show a glyph/dot).
- The generic "Custom module" request card stays neutral; the picked icon/color ride onto the **spawned** module.
- ⚠️ DS gap — the 11 extra colors are app-local; promote to DS tokens at handoff. ⛔ Editing a live module's icon/color/name isn't built (request-time only).

**Data model:** `Module.color?: ModuleColor` (9 accents + 11 customs); effective color = `color ?? accent` (custom sets `color`; prebuilt keep `accent`).

#### Relationship to the switcher

The switcher lists only **`active`** modules. Whether a user sees it (and which modules) is role-dependent, assigned in Agent Management. 🟡 In the prototype this is persona-driven, not an `active` filter — see [Open questions](#open-questions--need-clarification).

#### The request flow ✅ (🟡 persistence mocked)

**Request department module** → confirmation dialog:

- **Real module** → confirm → added to `pendingIds`; card moves to **Active** under an *Under review* overlay.
- **Custom module** → required **name** (unique, case-insensitive — blocks duplicates of any module) + icon/color pickers with live preview → spawns a pending copy. Empty/duplicate name shows an inline field error (`is-error` + `role="alert"`) that blocks Send. ⛔ request count uncapped (cap TBD).
- **Submit** — `Send request` → `Sending...` (~600ms) → success toast `Request submitted for "[name]".`, or in-dialog error `Couldn't send your request. Please try again.`
- 🟡 In-memory only; the dialog is a static mock (no focus trap / Escape).

#### Lifecycle & turning modules on/off ⛔ (in design)

Today: **request → our team sets it up → Active.** Being designed into something more flexible — goals set, specifics under discussion ([Open questions](#open-questions--need-clarification)):

- **Goals** — activation not always a request (support / self-serve / trial); reversible **on/off**; **trials** with easy revert; **removal always possible**.
- **Requirement** — every change **reversible and lossless** (off/end-trial/remove can't lose data or disturb shared resources; re-adding restores prior state). *How is eng's call.*
- **Draft lifecycle** — `Coming soon → Available → Setting up → Active ⇄ Off → Removed (re-addable)`; `Trial → Keep / End`.

### 1.2 Department switcher (top nav)

**Files:** `components/module-switcher/` · mounted in `ds-top-nav__actions`, gated by `@if (moduleCtx.showSwitcher())`.

- **What it does** ✅ — picking a module swaps the whole app into that module's view. It changes *which* module you're in; *what* you can do there is your role/permissions.
- **When it appears** ✅ — only for users with **>1 module**; **global admins always**; only **`active`** modules. Rule: `showSwitcher = isGlobalAdmin || availableModules.length > 1`.
- **What it shows** ✅ — **Trigger:** current context (module icon + name in its color, or globe + "Global"). **Menu:** a **Global** row (global admins only) + one row per assigned module showing the **set the role maps to** — Admin → "Department Admin", Agent → "Team Member" — resolved live via `MODULE_ROLE_PERMISSION_SET_ID`; check on the current one.
- **Global option** ✅ — global admins only; manage all modules at once.
- **Behavior** ✅ — `select(...)` re-renders the shell (can trigger the agent-role redirect off Settings/Analytics). Failed swap → error toast `Couldn't switch to [Module]. Please try again.` Outside-click + Escape close. Holds no data of its own.

---

## Project 2 — Agent Management

### Overview — the settings area, its tabs, and how it's wired

**Route:** `/settings/agent-management` · **Files:** `pages/settings/agent-management/` · **Shell:** `AgentManagementComponent`

The shell owns `<h1>Agent Management</h1>` + a `ds-tabs` bar and renders one tab at a time. **Tabs are context-gated:**

| # | Tab | Key | What | Shown |
|---|---|---|---|---|
| 1 | **Agents** | `agents` | User-directory table → [§2.1](#21-agents-tab) | Always (default) |
| 2 | **Authentication** | `authentication` | 2FA → [§2.6](#26-authentication-tab) | **Global context only** (district-level) |
| 3 | **Teams** | `teams` | Teams table → [§2.4](#24-teams-tab) | **Department context only** (hidden in Global) |
| 4 | **Permission Sets** | `permission-sets` | P3 table + editor → [§3](#project-3--permission-sets-handed-off-separately) | Always |

- **Teams** is department-scoped (a team belongs to one module), so it's hidden in the Global context — a global admin has no single dept to scope teams to. **Authentication (2FA)** is district-level, so it shows only in the Global context. An effect keeps `activeTab` valid: if the active tab isn't available in the current context, it falls back to **Agents**.
- **Tab state** is an in-memory signal (default `agents`); **no per-tab URL**, so refresh returns to Agents.
- **The agent profile is a separate routed page** (`/settings/agent-management/:id` → `AgentProfileComponent`, [§2.2](#22-agent-profile)), not a tab; a row click navigates there. The shared route prefix keeps the Settings subnav item selected.
- **An "agent" is a `User`** — no separate Agent type.
- **Who sees it & context scoping** ✅ — reachable by **any admin** (global admin in Global; department admin in their dept via `canAdminActions`); agents never see Settings. Tables are **scoped to the switcher context** and **re-mount on context change** (`@for (ctx of [moduleCtx.currentModuleId()]; track ctx)`) so the detached engine re-reads scoped rows.

**Files:** `agent-management.component.*` (shell) · `agents-tab/` · `agent-profile/` (+ `agent-activity-tab/`) · `agent-form/` · `teams-tab/` · `team-form/` · `authentication-tab/` · `permission-sets-tab/` + `permission-set-editor/` (P3) · `form-select.component.ts`.

#### The `table-init.js` pattern (applies to every table here)

Every table (Agents, Teams, Permission Sets, profile Activity) is the canonical Onflo DS table driven by the global `runtime/table-init.js` engine (wired in `angular.json`), not bespoke. Consequences:

- After render the component calls **`cdr.detach()`** — it hands the DOM to the engine; rows are a **static snapshot** (refresh re-seeds).
- A detached component **can't drive a modal**, so the **Create Agent / Create Team forms and the Permission Set editor are hosted on the parent shell** (stays attached), opened via signals.
- The engine **binds hard-coded global ids** (`#main-table`, …), so **only one engine table mounts at a time** — hence one tab at a time, and the profile's Activity table mounts only while active.
- Search / sort / filter / resize / reorder / pin / density / pivot / row-groups / context-menu / export are the engine's **DOM simulation** (🟡), not real queries. Every such table carries `<!-- TODO eng: replace with AG Grid + onfloTheme -->`. Shared overlay/panel/menu strings are boilerplate, not repeated below.

### 2.1 Agents tab

✅ built / 🟡 data · **Files:** `agents-tab/`

- **CTA:** `Create Agent` → shell opens the [Create Agent form](#23-create-and-edit-agent-form). **Search:** `Search agents…`.
- **Columns:** Name, Email, **Permission Sets**, Status, Module(s), Teams, Locations, Phone, Source, Job Title, Last Login, Date Added.
- **Permission Sets column** (3rd) resolves each agent's `permissionSetByModule` to set **names** via `PermissionSetsService` (de-duped, module order). Replaced the old "Roles" column; same SSOT as the profile and the Permission Sets table ([§3.5](#35-the-single-source-of-truth)).
- **Status** — `ds-label` pill: `Active` (green), `Pending` (yellow), `Inactive` (grey).
- **Row click → profile** ✅ — whole row navigates to `/settings/agent-management/:id`, opening in its own top-nav tab ([§2.2](#22-agent-profile)). No per-row menu.
- **Data:** `UsersService.byModule(currentModuleId)` — **context-scoped** (Global = all 32; a department = its own agents). ⛔ Download unwired; no paginator. ⚠️ ADA: clickable `<tr>` isn't keyboard-focusable.

### 2.2 Agent profile

✅ built / 🟡 data (Activity ⛔) · **Route:** `/settings/agent-management/:id` · **Files:** `agent-profile/`

A full-page profile (replaced a slide-out drawer); reads `:id` reactively. On open it collapses the subnav via `chrome.setEditorOpen(true)`.

- **Opens in its own top-nav tab** ✅ — a browser-style `ds-nav-tab` per agent (several open at once, pinned, individually closeable; close-all → Inbox). `OpenAgentTabsService` owns the open-id set; the shell renders the strip and derives the active tab from the URL; this component registers/focuses its tab via an `effect` on `:id`. Overflow collapses into the DS `…` tab (width-measured in `app.ts`). 🟡 in-memory; ⛔ `TODO eng: persist open tabs` + use the real DS overflow component.
- **Heading** — component-local breadcrumb `Agent Management › {name}` (⚠️ no DS breadcrumb — `TODO eng: promote`) + an `ds-sr-only <h1>`.
- **Hero card** — XL avatar, name, status pill, source chip, `{roles} · {location}` subtitle, `Edit` (opens [Edit Agent form](#23-create-and-edit-agent-form)). When `Pending`, a `Resend activation email` button → toast `Activation email resent to {email}.` (⛔ wire endpoint).
- **Tabs** (`ds-tabs`, default Details):

| Tab | Shows | Status |
|---|---|---|
| **Details** | Basic Information (`User ID`, names, Email, Phone, Status, Locations, Source, Job Title, Last Login, Date Added). Synced-locked fields show `Managed by {source}`. | ✅ / 🟡; ⛔ render real field set |
| **Permissions** | One card per module: that module's `Permission set` (blue pill, `Not assigned` fallback) + a `Teams · {n}` chip group. Non-agents: `Non-agent users are not assigned module-level permissions.` | ✅ / 🟡; ⛔ link pill to editor |
| **Activity** | `<app-agent-activity-tab>` audit trail (Date, Activity, Type, Details, Performed by). | ⛔ **hard-coded 18-row mock** — `TODO eng: real audit log` |

- The Activity table hosts the engine (global ids), so it mounts only while active and clears an orphan `#cp-picker-overlay` on open. **CSV** 🟡 scrapes the DOM (`agent-activity.csv`; ⛔ wire endpoint). **Expand** ✅ promotes the same wrapper to a viewport modal (never a 2nd table). Unknown id → `Agent not found`.

### 2.3 Create and Edit Agent form

✅ built / 🟡 submit mocked · **Files:** `agent-form/`

One `ds-modal`, two modes via `[agent]`. **Create** hosted by the shell; **Edit** by the profile. Both map to a `User`.

- **Title:** `Create New Agent` / `Add a new agent to the system` — or `Edit Agent` / `Update this agent's information`.
- **Sections:** **Personal Information** (`First Name`\*, Middle, `Last Name`\*, `Email`\*, Phone, Employee ID, Job Title, Locations multi); **Modules & Access** — repeatable rows of `Department`\* + `Permission Set` (optional) + `Teams` (multi), with add/remove; **Custom Fields** (⛔ hard-coded); **Activation** (create: radios `Send activation email`/`Activate user`/`Do not activate` → Pending/Active/Inactive) or **Account** (edit: status select).
- **Footer:** `Cancel` + `Add Agent` / `Save Changes`. **Synced agents** — `ds-alert--info` + locked fields (`SOURCE_LOCKED_FIELDS`).
- **Submit** ✅ validates ([Form validation](#form-validation)) before the mocked toast (`Agent created.` / `Agent updated.`) + close. Required: First/Last/Email (+ format) and each row's Department; Permission Set + Phone optional. ⛔ no real persistence / focus trap; perm-set/team options not yet scoped to the chosen department.

### 2.4 Teams tab

✅ built / 🟡 data · **Files:** `teams-tab/`

Engine-driven table. **A team belongs to one module, or is district-wide** (`Team.module: string | null`; `null` = global team). **Context-scoped:** a department shows its own teams; the **Global context shows global teams** (`module === null`). A team synced from an integration spanning modules is stored **once per module** (same name + members) — so no Module column is needed. *(In the product, this tab is hidden in the Global context — see [§2 overview](#overview--the-settings-area-its-tabs-and-how-its-wired) — so in practice it serves department contexts; the global-team scoping remains for completeness.)*

- **CTA:** `Create Team` → [Team form](#25-create-and-edit-team-form). **Search:** `Search teams…`.
- **Columns:** Team Name, Agents (`memberIds.length`), Permission Set (name or `None`), Source (`Manual` / `Active Directory` / `Azure` / `Google`), Last Updated.
- **Row click** → `editTeam` (bound at first render to survive `cdr.detach()`); editable for Manual, **read-only** for synced. ⛔ Download unwired.
- **Data:** `TeamsService.teams()` (11 seed: 5 single-module + 2 synced spanning two modules each as a module-specific pair + 2 global, `module: null`).

### 2.5 Create and Edit Team form

✅ built / 🟡 submit mocked · **Files:** `team-form/`

A `ds-modal` on the shell, three modes via `[team]`:

- **Create** (no team) — `Create New Team`; Name, Permission Set, Members editable. **No Department field** — module = current switcher context (Global → global team).
- **Edit, manual** — `Edit Team`; pre-filled, editable.
- **Edit, synced** — `Team Details`; **fully read-only** (`ds-alert--info` banner, disabled fields, members as static chips, `Close` only). Synced teams are edited in Integration Hub.
- **Fields:** `Team Name`\*, Permission Set, Members (chips — removable on manual/new, read-only on synced; below a `Search users to add…` field). 🟡 remove is visual; search non-functional (⛔ wire).
- **Submit** ✅ validates `Team Name` before the mocked toast (`Team created.` / `Team updated.`); ⛔ doesn't call `TeamsService`.

### 2.6 Authentication tab

🟡 mocked · **Files:** `authentication-tab/` · **Shown only in the Global context** (district-level — hidden for department admins).

A single panel for **2FA only** (no SSO): title `Two Factor Authentication (2FA)`, an intro, a `ds-toggle` (`2FA Enabled` / `2FA Disabled`, default off), and three static help sections. Toggle flips a local signal only — ⛔ `TODO eng: wire 2FA enable/disable`.

### 2.7 Data sources

Four singleton, signal-backed services (all 🟡 in-memory; dates are static ISO strings):

| Service | Provides | Mutators | Notes |
|---|---|---|---|
| `UsersService` | `users()` — 32 seed | `add`, `update`, `remove`, `byModule` | **SSOT for `User`**. Forms would call `add`/`update` on handoff (mocked today). |
| `TeamsService` | `teams()` — 11 seed | `add`, `update`, `remove`, `byModule` | **SSOT for `Team`**. `User.teams` ⟷ `Team.memberIds` bidirectional. One `module`, or `null` (global); synced-spanning teams are one record per module. |
| `TicketsService` | `tickets()` — 40 seed | `byModule` only | **SSOT for `Ticket`**; read-only. ⚠️ keys owner by `ownerName` string, not id. |
| `PermissionSetsService` | see [P3](#project-3--permission-sets-handed-off-separately) | `add`, `update`, `remove` | Permission-set SSOT. |

**Key shapes** (`models.ts`):

- **`User`** — `id, firstName, middleName?, lastName, email, phone?, status, source, roles, modules, teams, locations, jobTitle?, employeeId?, permissionSetByModule: Record<moduleId, permissionSetId>, lastLogin?, dateAdded`. `SOURCE_LOCKED_FIELDS`: SIS/AD/Google/Azure lock `firstName, lastName, email, status`; Manual locks none.
- **`Team`** — `id, name, module (id | null for global), memberIds, permissionSetId?, source`.
- **`Ticket`** — `id, number, subject, …, ownerName, moduleId, receivedAt, isMyTicket, isMyTeam`.

**Shared control** — `form-select.component.ts` (`app-form-select`) emits canonical `ds-select` markup so `runtime/select.js` drives it; owns no state (host reads the DOM at submit). ⛔ `TODO eng: replace with a reactive ds-select`.

---

## Project 3 — Permission Sets (handed off separately)

> **Handed off earlier as its own design.** This section is the **boundary**: what it is, its data model, and how it wires in. The UI lives inside Agent Management (`permission-sets-tab/` + `permission-set-editor/`) but is a separate deliverable.

### 3.1 What it is

A catalog of **permission sets** — named capability bundles assigned to agents (per module) and teams. Two views in Agent Management: a **table** of all sets, and a full-area **editor** for one.

### 3.2 Data model

`PermissionSet` (`models.ts`):

```
{ id; name; moduleId: string | null;               // null = system-wide, else a module id
  type: 'System' | 'Custom'; isLocked: boolean;
  isGlobalOnly?: boolean;                            // global-tier: Global Admin + any set created in Global context
  description?; departments?; allDepartments?;       // editor Details tab
  assignedUserIds?; assignedTeamIds?;
  capabilities: Record<string, boolean | string>;    // perm id → toggle or segment value
  updatedAt }                                        // ISO; stamped on create/update
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

- **Read-only when `isLocked || type === 'System'`** — so all six System sets open read-only.
- **`Global Admin`** (renamed from *System Administrator*; id unchanged) carries **`isGlobalOnly: true`** — global-tier, shown only in Global context. **`Department Admin`** is the department-tier admin set. The switcher maps a module role to one via `MODULE_ROLE_PERMISSION_SET_ID` (Admin → `ps-dept-admin`, Agent → `ps-team-member`).
- **Global-tier sets** (`isGlobalOnly`) list only in the Global context and expose only district config. Any set created in the Global context is marked `isGlobalOnly`.
- **Catalog** in **`permission-catalog.ts`**: two `PermissionSection[]` arrays — **`ACTIONS_SECTIONS`** (Tickets, Assets, Analytics, Campaigns) and **`SETTINGS_SECTIONS`** (Global · General · Integration Hub · Automations · Tickets · Assets · Call Center), **105 perms**, ported from Figma Make. **`ROLE_PRESET_STATES`** (keyed by role name, mapped via `SET_ROLE_PRESET`) is the read-only config each system set renders with. Each section/perm may carry **`tier: 'global' | 'department'`** (omitted = department). **Global-tier sections:** Global, Integration Hub, Call Center. **`globalTierSections()`** narrows a catalog to global-tier sections/perms (a global set's editor); **`departmentTierSections()`** is the complement (a department set's editor — General, Automations, Tickets, Assets).
- Methods `add`, `update`, `remove` (`add`/`update` stamp `updatedAt`). ⚠️ `remove()` has no caller — no delete UI.

### 3.3 Permission Sets tab

✅ built / 🟡 data · **Files:** `permission-sets-tab/`

Engine-driven table.

- **CTA:** `Create permission set` → **New Permission Set modal** (`create-permission-set-modal/`): name, description, context-locked **Department** (Global → "Global"), optional **Copy From**. On Create (validates required `Name`) it adds the set (**created in Global → marked `isGlobalOnly`**) and opens its editor.
- **Search:** `Search permission sets…`. **Columns:** Name, Type (System blue / Custom grey), Agents (count assigned, context-scoped), Last Updated.
- **Context-scoped** ✅ — Global shows only the **global-tier** set (`Global Admin`); a department shows system-wide sets + its own custom sets, hiding `Global Admin`. Re-mounts on context change.
- **Whole row → editor** ✅. No kebab.

### 3.4 Permission Set editor

✅ built / 🟡 save in-memory · **Files:** `permission-set-editor/` (shell + state service + four tab components)

Opens **full-area, replacing the tab bar** (driven by `editingSetId`; parent stays attached). Collapses the subnav. A faithful port of the Figma Make config flow.

- **Shell** — back-affordance, set name (+ `System` badge when read-only), and **tab bar live in the page heading** (`agent-management.component`); **Save Changes / Discard** are a **bottom save bar** (`chrome.saveBar`, shown while `state.dirty()` — includes buffered assignment edits). Tabs: **Details · Data Visibility · Actions · Settings** — except **global-tier sets show only Details + Settings** (Data Visibility + Actions dropped). Provides the per-editor **`PermissionEditorStateService`**.
- **State service** — working name/description/capabilities/data-visibility/assignments + mutators, and a `setId` signal. On load, **assignments seed from live data** (holders via `permissionSetByModule` + teams via `Team.permissionSetId`, context-scoped). System sets seed read-only from `ROLE_PRESET_STATES`; catalog-keyed custom sets clone verbatim; new sets default. `dirty` = working ≠ baseline. `save()` flushes assignments always; name/description/capabilities only on editable sets.
- **Details tab** — name + description + **Assigned Users & Teams**, derived from live data (matches the table's Agents count). Members are **removable chips**; an **Add Assignment** modal (searchable). Add/Remove are **buffered** (dirty → committed on Save / reverted on Discard). 🟡 don't truly persist (⛔ `TODO eng`).
- **Data Visibility tab** — Tickets + Assets scopes (All / Assigned) + the Assets **filter builder** (Asset Type / User Type / Grade multiselects, each with Exclude + live helper). **Hidden for global-tier sets.**
- **Actions & Settings tabs** — both render the shared **`pset-matrix-tab`** (left section nav + search, right perm grid), fed `ACTIONS_SECTIONS` / `SETTINGS_SECTIONS`. Each row is a toggle or segment (`Hide`/`View`/`Manage` or `…/Edit`); a `Manage` segment reveals sub-checkboxes; per-section presets (`No Access`/`View Only`/`Full Access`/`Custom`). **Tier filtering:** a **global-tier set** hides the Actions tab and shows only the district-wide Settings sections (Global, Integration Hub, Call Center) via `globalTierSections()`; a **department set** shows only the department-tier sections (General, Automations, Tickets, Assets) via `departmentTierSections()` — never the district ones. The matrix component is unchanged; it just receives a smaller `sections` array.
- **Save** 🟡 — in-memory (`setsSvc.update`) + success toast `Permission set saved.` A blank name triggers the save-bar error (not a toast), switches to Details, shows `Name is required.` **Duplicate** (system sets) → a `{name} (copy)` Custom set, opened editable.
- ⚠️ **Capability vocabulary** — seed sets store *legacy* keys (`manageUsers`, …); the editor seeds from `ROLE_PRESET_STATES` and rewrites `capabilities` to catalog ids (`tk-*`, `gl-*`, …) on save.

### 3.5 The single source of truth

`PermissionSetsService.sets()` is the one dataset. Sets are referenced **by id** everywhere and read by **eight surfaces** (most resolve id → name; the editor's assigned list reads the reverse):

| Surface | Reads | Resolves to |
|---|---|---|
| Agents table **Permission Sets** column ([§2.1](#21-agents-tab)) | `user.permissionSetByModule` | set names (joined) |
| Agent profile **Permissions** tab ([§2.2](#22-agent-profile)) | `…[moduleId]` | set name per module |
| Create/Edit **Agent form** ([§2.3](#23-create-and-edit-agent-form)) | `sets()` | dropdown options |
| Teams table **Permission Set** column ([§2.4](#24-teams-tab)) | `team.permissionSetId` | set name (`None`) |
| Create **Team form** ([§2.5](#25-create-and-edit-team-form)) | `sets()` | dropdown options |
| **Permission Set editor** ([§3.4](#34-permission-set-editor)) | `sets()` | the **one writer** |
| **Editor — Assigned Users & Teams** ([§3.4](#34-permission-set-editor)) | `permissionSetByModule` + `Team.permissionSetId` (reverse) | agents/teams on the set |
| Department **switcher** role label ([§1.2](#12-department-switcher-top-nav)) | `sets()` via `MODULE_ROLE_PERMISSION_SET_ID` | role → set name |

All eight stay wired to one dataset; the editor is the only writer; there is no delete. (`ChromeService.setEditorOpen` is the shared mechanism the editor and agent profile use to collapse the subnav.)

### 3.6 Settings permissions ↔ the product Settings nav

⛔ spec — the contract eng wires; not active in the prototype yet.

The Settings catalog (`SETTINGS_SECTIONS`) is the permission mirror of the product's **Settings sidebar nav** (`app.ts` `_settingsItems`): the **same seven sections in the same order** (Global · General · Integration Hub · Automations · Tickets · Assets · Call Center), **one permission per nav item**. The granted level gates that item in a holder's Settings nav: **Hide** → not rendered; **View** → read-only; **Manage/Edit** → editable. A sub-group gates as a unit (e.g. Topic Manager).

**The two lists must stay in lockstep — add/rename a nav item ⇒ add/rename the matching permission (and vice versa)**, so the mapping stays 1:1. In the prototype the sidebar is static (only Department Modules + Agent Management are live pages) and the set is mocked, so nothing hides today. `<!-- TODO eng: gate each settings nav item on the active set's SETTINGS_SECTIONS value -->`

**Tier ↔ context:** the catalog `tier` mirrors the nav's context gating — global-tier sections (**Global, Integration Hub, Call Center**) are the Global-context-only settings; department-tier sections (**General, Automations, Tickets, Assets**) are what a department admin manages. `globalTierSections()` / `departmentTierSections()` ([§3.4](#34-permission-set-editor)) apply this in the editor. Perm ids keep their `gl-` prefix even where regrouped, so `ROLE_PRESET_STATES` (keyed by perm id) stays valid unchanged.

---

## Status summary — what's left to wire

**Shared foundation**

| Area | Status | Note |
|---|---|---|
| Module context + nav/Settings gating | ✅ / 🟡 | Persona-derived via `ModuleContextService` |
| Integration Hub access (global + per-dept grants) | ✅ / 🟡 | Visibility via `IntegrationsService`; Marketplace UI is the Integrations team's |
| App-wide messaging | ✅ | `MessagingService` + top-center snackbar |
| Form validation (required + email/phone) | ✅ / 🟡 | On-submit; submit stays mocked |
| Theme (light/dark, persisted) | ✅ | |
| Persona swapper (⌘K) | ✅ / 🟡 | Demo stand-in |
| Session / timeout messaging | ⛔ | None today |
| Real auth replacing `PersonaService` | ⛔ | |

**Project 1 — Department Modules**

| Area | Status | Note |
|---|---|---|
| Module catalog + groups | ✅ | SSOT = `ModulesService` |
| Request flow (incl. custom) | ✅ / 🟡 | Toasts + on-submit validation; in-memory |
| Custom appearance (name/icon/color) | ✅ / 🟡 | ~30 icons + 20 colors; 11 colors app-local (DS candidate) |
| Switcher | ✅ | Persona-derived |
| Switcher shows only `active` modules | ⛔ | Persona-driven (see Open questions) |
| Module lifecycle (on/off, trial, remove) | ⛔ | In design |
| Request persistence + focus trap | ⛔ | In-memory / static mock |

**Project 2 — Agent Management**

| Area | Status | Note |
|---|---|---|
| Agents / Teams tables | ✅ / 🟡 | `table-init.js` sim; replace with AG Grid |
| Agents Permission Sets column | ✅ | Resolves `PermissionSetsService` |
| Agent profile (Details / Permissions) | ✅ / 🟡 | Live off in-memory services |
| Agent profile **Activity** tab | ⛔ | Hard-coded mock — needs a real audit log |
| Create/Edit Agent + Team forms | ✅ / 🟡 | On-submit validation; submit mocked |
| Authentication (2FA) | 🟡 | Not persisted; Global-context-only; no SSO |
| Tab gating (Teams dept-only, 2FA global-only) | ✅ | Context-gated + active-tab reconcile |
| CSV export (Activity) | 🟡 | DOM scrape; wire endpoint |
| Form focus trap / custom-field schema | ⛔ | Not built / hard-coded |

**Project 3 — Permission Sets** *(handed off separately)*

| Area | Status | Note |
|---|---|---|
| Table + full-area editor | ✅ / 🟡 | Create/edit in-memory |
| SSOT wiring (8 surfaces) | ✅ | One dataset, id-resolved; editor is the only writer |
| Tier filtering (global vs department editor) | ✅ | `globalTierSections` / `departmentTierSections` |
| Capability vocabulary | ⚠️ / ⛔ | Legacy keys rewritten on save — needs a real schema + migration |
| Manage sub-permissions / Data-Visibility builder | ⛔ | Local UI only |
| Delete a permission set | ⛔ | `remove()` exists, no UI |

---

## Open questions — need clarification

1. **Switcher vs. active modules.** The rule is "switcher shows only `active` modules," but demo personas are assigned to non-active modules, so it isn't demonstrable as-is. Depends on the persona/assignment model.
2. **Module lifecycle.** Is **"off"** a distinct paused state or just remove? When a trial ends un-kept, does its data come back on re-add or get cleared? Which modules use which activation method (request / self-serve / trial)?
3. **Custom-module request cap.** Uncapped today; cap planned, rule TBD.
4. **Permission model & capability schema** (P3). Production needs the real capability schema + a migration for the legacy↔catalog vocabulary mismatch. The nav/Settings gating and per-module roles map onto this model.
5. **Agent activity / audit log.** The Activity tab is a hard-coded mock — needs a real per-agent audit source + schema.
6. **Custom fields.** The agent form's custom fields are hard-coded; production needs the district custom-field schema (+ integration-driven field toggling).
