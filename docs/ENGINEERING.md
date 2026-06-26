# Engineering Architecture — Onflo Modules Prototype

**Date:** 2026-06-26 · **Branch:** `main` · **Status:** Draft for engineering handoff

> The single technical reference for the Onflo Modules prototype. It covers **three projects** that
> share one spine — **Department Modules** ([P1](#project-1--department-modules)),
> **Agent Management** ([P2](#project-2--agent-management)), and **Permission Sets**
> ([P3](#project-3--permission-sets)).
>
> **New here?** Read [What this is](#what-this-is) → [How the system fits together](#how-the-system-fits-together)
> → [Driving the prototype](#driving-the-prototype), then jump to your project.

---

## What this is

A **design-mode prototype** of the Onflo Modules feature set — a clickable Angular mock-up with **no backend**. It exists so product, design, and engineering can agree on *how the feature behaves* before anyone builds it for real.

Two things to keep straight while reading:

- **The UI is real and exact.** Every label, message, character limit, empty state, column, and toast in this doc is copied verbatim from the running app. A string in `code font` (e.g. `Agent created.`) is the literal text the prototype shows today.
- **The backend is not built.** Persistence, real failures, live permission enforcement, module activation, audit logging — none of it exists. Where we know the *intended* behavior, it's flagged.

This doc describes **what the prototype does and how to see it for yourself** — not how to build the production version. That's engineering's call. Where the prototype fakes something, it says so, so you know what's still open.

### Status legend

| | Meaning |
|---|---|
| ✅ | **Built** and working |
| 🟡 | **Mocked** — works on screen, but static / in-memory (resets on refresh) |
| ⛔ | **Planned** — not built |

---

## How the system fits together

Three projects on one shared spine: one defines **what modules exist**, one assigns **who gets what**, and one defines **the capability bundles** that assignment hands out.

| Project | Owns | Route(s) | Detail |
|---|---|---|---|
| **1 · Department Modules** | The module catalog, the top-nav **switcher**, and module-context gating | `/settings/department-modules` | [P1](#project-1--department-modules) |
| **2 · Agent Management** | **Agents**, **Teams**, **Authentication**, and the screen that hosts Permission Sets | `/settings/agent-management(/:id)` | [P2](#project-2--agent-management) |
| **3 · Permission Sets** | The permission-set **catalog + editor**; the per-module permission model | *(lives inside Agent Management)* | [P3](#project-3--permission-sets) |

> Terminology: the old **"User Management"** is now **Agent Management** (P2). **Permission Sets** (P3) is its own project but its UI lives inside Agent Management — and it's part of this handoff.

### The shared spine

Four ideas hold the three projects together.

- **The module catalog** is the single list of what modules exist. Department Modules owns it; everything else reads it.
- **The current view** — which module you're in (or Global), your role there, and what nav and Settings you can see — is *derived* from the signed-in user. This is the seam every project plugs into.
- **The signed-in user** drives everything. In the prototype that user is a swappable **demo persona** (see [Driving the prototype](#driving-the-prototype)); in production it's the real authenticated user.
- **Permission assignment is per module.** A user holds one permission set *per module*; a team holds one. Both point at the Permission Sets catalog.

### How the data flows

Department Modules defines the modules → Agent Management assigns *who gets which module, role, team, and permission set* → the derived "current view" renders what each user sees (their nav, their switcher, their Settings) → Permission Sets defines the capability bundles those assignments hand out. Everything resolves to one in-memory copy of each dataset, so the catalog, switcher, tables, and profiles never disagree.

### What changes what you see (the permission seam)

*This is where P1 and P2 meet: Agent Management assigns access, and the derived view renders it.* What a user is assigned — modules, role per module, permission set — changes what's visible:

- **Side nav** — **Assets** shows only in a module that includes Asset management; **Analytics** only with Dashboard analytics, and never for agents; **Settings** is hidden from agents entirely.
- **Inside Settings**, each section is gated by context + capability:
  - **Global** (district-wide; **Global context only** — a global admin loses it the moment they scope into a module, and department admins never see it): District Profile, AI Training Resources, Custom Fields, Department Modules, Labels, Languages, Locations, Portal Branding.
  - **General** (department-tier; shows for **any admin**): Activity Log, Agent Management, Chatbot, Communications, Keyword Alerts, Live Agent, Tags. A department admin sees their own department's; a global admin sees it in Global too. **Agent Management lives here**, which is how department admins reach it.
  - **Integration Hub** — district-level like Global, with a per-department grant exception (see below).
  - **Automations** needs the module's workflow capability · **Tickets** is every admin · **Assets** needs Asset management · **Call Center** is district-level (Global context only).

The Settings sidebar and the Permission Sets catalog are kept **1:1** — same sections, same order (see [§3.6](#36-settings-permissions--the-product-settings-nav)).

#### Integration Hub access

**A separate team owns Integration Hub** — this prototype only demos the *access* behavior.

- **Default:** district-level, like Global — visible only in the **Global context**.
- **Grant:** in the **Marketplace** (global admins only) a global admin can assign department modules as **managers** of specific integrations. ⛔ The Marketplace assignment UI belongs to the Integrations team and isn't built here.
- **A granted department's view** is a *scoped* Integration Hub — only its **Installed Apps**, never the district tools (API Tokens, Webhooks, Marketplace).
- **To see it:** the demo grants **HR** the DocuSign + BambooHR integrations, so switching to **Linda** (HR admin) shows the scoped hub.

### App-wide behaviors

These three behaviors are shared across every page.

**Messaging — one toast system, top-center.** ✅

- **Success** — auto-dismisses after 3s; also has a manual ×.
- **Error** — shows an error icon plus a **Retry** button and a dismiss (×) button, and **never auto-dismisses**.
- **In-modal failures** — instead of a toast, an error alert appears at the top of the open dialog; the dialog stays open and the primary button retries.
- ⚠️ The design system has no snackbar *error* variant yet, so error toasts reuse the text-action shell with a tinted icon.
- 🟡 Mock actions always succeed — to *see* a failure, [Shift-click](#triggering-error-states) the action.

**Form validation — on submit.** ✅ (🟡 the submit itself stays mocked.) Every create/edit form validates **required fields when you click the primary action** — errors stay hidden until then. On an invalid submit the form **doesn't close and doesn't toast**: it surfaces the errors, focuses the first invalid control, and clears each error as you fix it.

- **Field-level** — the field shows an error state, keeps its `*`, and renders a message with `role="alert"`.
- **Summary** — modals show an error alert at the top of the dialog body; the Permission Set editor (which is full-area, not a modal) flips its docked save bar to an error state and jumps to the offending field.
- **Rules** — required text must be non-empty; required select must have a choice; **Email** is required and format-checked (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`); **Phone** is optional but format-checked when filled.

**Session & timeout.** ⛔ None today — no session-expiry, idle, or auth-timeout handling. (The `setTimeout`s in the code are UI timing only.)

---

## Driving the prototype

Everything in the app is driven by **who you're signed in as**. There's no login screen — instead you swap between demo personas, and the whole shell (nav, switcher, Settings, tables) re-renders for that person. This is how you see each role, context, and edge case.

### Switching personas — ⌘K

Press **⌘K** (or **Ctrl+K**) to open the persona swapper and pick someone. The app re-renders instantly as that person. It opens as **Scarlett Bailey** (a global admin) so you start with full access.

| Persona (⌘K) | Who they are | What switching to them shows you |
|---|---|---|
| **Scarlett Bailey** *(default)* | Deputy Superintendent — **global admin**, admin of all 6 modules | The full-access view: the **Global** context, every module in the switcher, and every Settings section including **Global** and **Authentication (2FA)** |
| **Marcus Lee** | Transportation Manager — admin of **2 modules** (Transportation + Classic), not global | A **multi-module department admin**: the switcher with more than one module, department-scoped tables, and **General** Settings but no **Global** section |
| **Linda Okafor** | HR Director — admin of **HR only** | A **single-module department admin**, plus the **scoped Integration Hub** (HR is granted DocuSign + BambooHR, so she sees Installed Apps only) |
| **James Carter** | Help Desk Technician — **agent** in IT | The **agent view**: no Settings, no Analytics (an agent who lands on those is redirected away) |
| **Hannah Cohen** | Facilities Manager — **agent** in Facilities | Another agent view, in a different module |
| **Priya Nair** | Director of Technology — global admin, IT only | The **first-time-setup scenario** — see below |

### The first-time-setup scenario (Priya)

Most personas share one fully-configured demo district. **Priya is different**: switching to her loads a separate "**fresh IT setup**" world that demonstrates a brand-new account before anyone has configured it — agents **synced from Active Directory** with no manual entries, **no teams**, **no custom permission sets** (system sets only), **no custom fields**, and **only the IT module** enabled. Switching back to any other persona restores the normal district. The swap happens instantly.

### Switching module context

For anyone with more than one module, the **switcher in the top nav** changes *which module you're looking at* — or **Global**, for global admins. Picking a module re-renders the whole app into that module's view. Keep the distinction in mind: the switcher changes *what you're looking at*; your role and permissions change *what you can do there*.

### Triggering error states

Mock actions always succeed, so to see the failure UI: **hold Shift while clicking** a primary action (Save, Create, Send, switch module, etc.). You'll get the matching failure — an error toast (with Retry, never auto-dismissing) or an in-modal error alert. This is the fastest way for QA to exercise the error paths.

### What's mocked — and what resets

Everything lives in memory. **A browser refresh re-seeds all data**, so anything you create or edit while clicking around — new agents, new teams, pending module requests, permission-set edits, the 2FA toggle — **resets on refresh**. Nothing persists, and the data tables (search/sort/filter/etc.) are a visual simulation, not real queries (see [how the tables behave](#the-tabs) under Agent Management).

### Theme

The app supports **light and dark mode**, and the choice is remembered across refreshes. ✅

---

## Project 1 — Department Modules

**Route:** `/settings/department-modules` (the default landing page).

**A department module** is a **divider** that splits one account into departments which share the system but not each other's work. Tickets route to their own divider — a Classic agent never sees IT tickets — yet work can hand off across departments, and **integrations are shared** (one SIS serves everyone).

### 1.1 The Department Modules page

Where an admin sees their own modules, browses what's available or upcoming, and requests new ones. Modules are grouped three ways: ✅

- **Active** — modules you own, plus anything you've requested that's pending.
- **Available** — released prebuilt modules you haven't added yet (requestable), plus the **Custom module** request card.
- **Coming soon** — unreleased prebuilt modules: a muted preview with a `Coming soon` label and no request button.

**The prebuilt set** is Classic, Transportation, IT, HR, and Facilities. Released today: **Classic** (Active — it's the base module) and **IT** (Available); the rest are **Coming soon**. The catalog also seeds one example **custom** module — **Music** (Active) — to show how a custom module renders, which is why a global admin like Scarlett sees six modules, not five. (The first-time-setup scenario drops Music and leaves only IT active.)

#### What each module contains ✅

| Feature | Classic | IT | Custom |
|---|:--:|:--:|:--:|
| Service desk ticketing | ✓ | ✓ | ✓ |
| Dashboard analytics | ✓ | ✓ | — |
| Workflow automation | ✓ | ✓ | — |
| Asset management | — | ✓ | ✓ |

A **Custom** module's contents are fixed at ticketing + assets — only its identity (name, icon, color) is chosen. **Coming soon** modules carry a *planned* (non-final) feature list.

#### Custom module appearance & naming

Because a custom module's contents are fixed, its **identity is its name + icon + color**, all picked in the request dialog and shown with a live preview. Once requested, it renders like a prebuilt module (tinted tile + filled glyph on its card and in the switcher).

- **Icon** — a preset library of **~30 filled Material Symbols**, curated for K12 service-desk departments. Always filled.
- **Color** — a preset palette of **20 colors**: the 9 design-system accents plus 11 K12-specific colors the design system doesn't ship.
- **Pickers** — two popover dropdowns (icon, color), each with a live card preview.
- ⚠️ The 11 extra colors are defined app-locally (in `src/styles.scss`), not in the design system yet — a candidate to fold into DS tokens at handoff. ⛔ Editing a *live* module's icon/color/name isn't built — appearance is chosen at request time only.

#### How it relates to the switcher

The switcher lists only **active** modules. Whether a given user sees the switcher (and which modules) depends on their assignment, authored in Agent Management. 🟡 In the prototype this is persona-driven rather than filtered by `active` status.

#### The request flow ✅ (🟡 persistence mocked)

**Request department module** opens a confirmation dialog:

- **A real module** → confirm → it moves to **Active** under an *Under review* overlay.
- **A custom module** → requires a **name** (unique, case-insensitive — duplicates of any existing module are blocked) plus the icon/color pickers, then spawns a pending copy. An empty or duplicate name shows an inline field error that blocks **Send**. ⛔ The number of requests is currently uncapped (a cap is planned, rule TBD).
- **On submit** — `Send request` → `Sending...` (~600ms) → either a success toast `Request submitted for "[name]".` or, on failure, an in-dialog error `Couldn't send your request. Please try again.`
- 🟡 In-memory only; the dialog is a static mock (no focus trap, no Escape-to-close).

#### Turning modules on and off — lifecycle ⛔ (in design)

Today the flow is simple: **request → our team sets it up → Active.** A more flexible lifecycle is being designed; the goals are set but specifics are still open:

- Activation won't always be a request (also support-driven, self-serve, or trial), modules can be reversibly turned **on/off**, **trials** can be ended and reverted easily, and **removal is always possible**.
- The hard requirement: every change is **reversible and lossless** — turning a module off, ending a trial, or removing it can't lose data or disturb shared resources, and re-adding restores the prior state. *How to guarantee that is engineering's call.*

### 1.2 The department switcher (top nav)

Mounted in the top-nav action area; shown only when the current persona has access to it.

- **What it does** ✅ — picking a module swaps the whole app into that module's view. It changes *which* module you're in; *what* you can do there is your role and permissions.
- **When it appears** ✅ — only for users with **more than one module**; **global admins always** see it; it lists only **active** modules.
- **What it shows** ✅ — the **trigger** displays the current context (the module's icon + name in its color, or a globe + "Global"). The **menu** has a **Global** row (global admins only) plus one row per assigned module, each labeled with the **permission set its role maps to** — Admin → "Department Admin", Agent → "Team Member". The current context is checked.
- **Behavior** ✅ — selecting re-renders the shell (and can trigger the agent redirect off Settings/Analytics). A failed switch shows an error toast `Couldn't switch to [Module]. Please try again.` Clicking outside or pressing Escape closes it. The switcher holds no data of its own.

---

## Project 2 — Agent Management

**Route:** `/settings/agent-management` · reachable by **any admin** (a global admin in the Global context; a department admin within their own department). Agents never see it — they don't see Settings at all.

The page is a shell that owns the `Agent Management` heading and a tab bar, showing **one tab at a time**. The tables on each tab are **scoped to the current switcher context** — the Global context shows everything; a department shows only its own — and they re-render when you switch context.

### The tabs

| # | Tab | What it is | When it shows |
|---|---|---|---|
| 1 | **Agents** | The agent directory table → [§2.1](#21-agents-tab) | Always (the default) |
| 2 | **Authentication** | 2FA settings → [§2.6](#26-authentication-tab) | **Global context only** (it's district-level) |
| 3 | **Teams** | The teams table → [§2.4](#24-teams-tab) | **Department context only** (a global admin has no single department to scope teams to) |
| 4 | **Permission Sets** | The P3 table + editor → [§3](#project-3--permission-sets) | Always |

- If you switch to a context where the active tab doesn't apply, it falls back to **Agents**.
- 🟡 Tab state is in-memory and not in the URL, so a refresh returns to Agents.
- **The agent profile is a separate page** (`/settings/agent-management/:id`), not a tab — clicking a row navigates there ([§2.2](#22-agent-profile)). An "agent" is just a `User`; there's no separate Agent type.

> **How the tables behave.** Every table in Agent Management (Agents, Teams, Permission Sets, and the profile's Activity log) is the standard Onflo data table. In this prototype that means three things worth knowing:
> - **Search, sort, filter, resize, reorder, pin, density, pivot, row-grouping, the context menu, and export are a visual simulation** — they rearrange what's on screen but aren't real queries. Each table is marked `<!-- TODO eng: replace with AG Grid + onfloTheme -->` in the source.
> - **The rows are a static snapshot** — a refresh re-seeds them, and edits reset.
> - **Only one of these tables is live at a time**, which is why the page shows one tab at a time and the profile's Activity table only runs while that tab is open.

### 2.1 Agents tab

✅ built / 🟡 data

- **Action:** `Create Agent` opens the [agent form](#23-create-and-edit-agent-form). **Search:** `Search agents…`.
- **Columns** (the default set, left to right): **Name, Email, Permission Sets, Status, Module(s), Teams, Locations, Phone, Source, Job Title, Last Login, Date Added.**
- **Permission Sets** (3rd column) resolves each agent's per-module assignment to set **names** (de-duplicated, in module order). It replaced the old "Roles" column and reads the same source as the profile and the Permission Sets table ([§3.5](#35-the-single-source-of-truth)).
- **Status** is a pill: `Active` (green), `Pending` (yellow), `Inactive` (grey).
- **Clicking a row** opens that agent's profile ([§2.2](#22-agent-profile)). There's no per-row menu.
- **Data** is context-scoped — the Global context shows all **32** seeded agents; a department shows only its own. Of the categorical columns, only **Status** is set up to row-group; the rest (Permission Sets, Module(s), Teams, Locations, Source) appear as filter facets instead. ⛔ The download button is unwired and there's no paginator. ⚠️ ADA: the clickable row isn't keyboard-focusable yet.

### 2.2 Agent profile

✅ built / 🟡 data (Activity ⛔) · **Route:** `/settings/agent-management/:id`

A full-page profile (it replaced an older slide-out drawer). Opening it collapses the Settings subnav.

- **It opens in its own top-nav tab** ✅ — a browser-style tab per agent, so several can be open at once, each pinned and individually closeable (closing them all returns to Inbox). Overflow collapses into a `…` tab. 🟡 The open tabs are in-memory and ⛔ not persisted across refresh.
- **Heading** — a breadcrumb `Agent Management › {name}` plus a screen-reader-only `<h1>`. ⚠️ There's no design-system breadcrumb component yet.
- **Hero card** — an XL avatar, the name, a status pill, a `{source} · {email}` subtitle (plain text), and **Edit** (opens the [agent form](#23-create-and-edit-agent-form)). When the agent is `Pending`, a **Resend activation email** button shows a toast `Activation email resent to {email}.` (Shift-click it to see the failure: `Couldn't resend the activation email to {email}.`) ⛔ No endpoint behind it.
- **Tabs** (default **Details**):

| Tab | Shows | Status |
|---|---|---|
| **Details** | The 12 basic-info fields: First Name, Last Name, Middle Name, Email, Phone, Job Title, Employee ID, Source, Account Status, Locations, Date Added, Last Login. (Per-field "Managed by" notes were removed here — sync provenance now surfaces in the [agent form](#23-create-and-edit-agent-form).) | ✅ / 🟡 |
| **Permissions** | One card per module — that module's permission set (a blue pill, or a `Not assigned` fallback) and a `Teams · {n}` chip group. Only **Active** agents carry permission sets, so Pending/Inactive agents (and non-agents) show the empty state `No module permissions` / `Module-level permissions apply to agents only.` | ✅ / 🟡 |
| **Activity** | An audit trail — columns **Date, Time, Action, Description**. | ⛔ a **hard-coded 18-row mock** (Pending agents show an empty Activity state); no real audit source behind it |

- The Activity table is one of the simulated tables, so it only runs while that tab is open. **Expand** promotes it to a full-viewport modal. 🟡 **CSV export** scrapes what's on screen into `agent-activity.csv` (⛔ no endpoint). An unknown `:id` shows `Agent not found`.

### 2.3 Create and Edit Agent form

✅ built / 🟡 submit mocked

One modal with two modes. **Create** is opened from the Agents tab; **Edit** from the profile. Both map to a `User`.

- **Titles:** `Create New Agent` / `Add a new agent to the system`, or `Edit Agent` / `Update this agent's information`.
- **Sections:**
  - **Personal Information** — `First Name`\*, Middle Name, `Last Name`\*, `Email`\*, Phone, Employee ID, Job Title, Locations (multi-select).
  - **Modules & Access** — repeatable rows, each with a `Department Module`\* select + Permission Set (optional) + Teams (multi), with add/remove ("Add another department module").
  - **Custom Fields** — ⛔ the form hard-codes three fields (Office/Room, Shift, Badge ID). (The agent *profile* renders custom fields from a real `CustomFieldsService`, but the form does not yet.)
  - **Activation** (create) — radios `Send activation email` / `Activate user` / `Do not activate`, which map to Pending / Active / Inactive. On edit this becomes an **Account Status** section: a status select, plus a `Resend activation email` button when the agent is Pending.
- **Footer:** `Cancel` + `Add Agent` / `Save Changes`.
- **Synced agents** show an info banner and lock the fields owned by their sync source.
- **Submit** ✅ validates (required: First / Last / Email + format, and each row's Department Module; Permission Set and Phone are optional) before showing the mocked toast `Agent created.` / `Agent updated.` and closing. ⛔ No real persistence or focus trap; the permission-set and team options aren't yet scoped to the chosen department.

### 2.4 Teams tab

✅ built / 🟡 data

**A team belongs to one department (module).** The Teams tab is **department-only** — it's hidden in the Global context (see [the tabs](#the-tabs)), so teams are only ever viewed and created inside a department. A team synced from an integration that spans modules is stored **once per module** (same name, same members), so no "Module" column is needed.

- **Action:** `Create Team` opens the [team form](#25-create-and-edit-team-form). **Search:** `Search teams…`.
- **Columns:** **Team Name, Agents** (member count)**, Permission Set** (name, or `None`)**, Source** (`Manual` / `Active Directory` / `Azure` / `Google`)**, Last Updated.**
- **Clicking a row** opens it — editable for Manual teams, **read-only** for synced ones. ⛔ The download button is unwired.
- **Data:** the seed mixes single-department teams and synced cross-module teams (a synced team spanning modules is stored once per module). ⚠️ It also still ships **two leftover district-wide teams** (`module: null`) from the old global-team model — now that the tab is department-only they render in **no context** (orphaned data), and `Team.module` is still typed `string | null`. `<!-- TODO eng: drop the global-team seed + make module non-nullable -->`

### 2.5 Create and Edit Team form

✅ built / 🟡 submit mocked

One modal with three modes:

- **Create** — `Create New Team`; Name, Permission Set, and Members are editable. **No Department field** — the team belongs to the department you're currently in (the tab is department-only).
- **Edit, manual** — `Edit Team`; pre-filled and editable.
- **Edit, synced** — `Team Details`; **fully read-only** (an info banner, disabled fields, members as static chips, and only a `Close` button). Synced teams are edited in Integration Hub.
- **Fields:** `Team Name`\*, Permission Set, and Members. Members are added via an `Add agents…` control (with a `Search agents…` field) and shown as chips — removable on manual/new teams, read-only on synced — with a `Filter members…` box. 🟡 Removing a chip is visual only and the search is non-functional.
- **Footer:** `Cancel` + `Add Team` (create) / `Save Changes` (edit). **Submit** ✅ validates `Team Name` before the mocked toast `Team created.` / `Team updated.` ⛔ It doesn't actually write to the teams data yet.

### 2.6 Authentication tab

🟡 mocked · **Shown only in the Global context** (it's district-level).

A single panel for **2FA only** (no SSO): the title `Two Factor Authentication (2FA)`, an intro, a toggle (`2FA Enabled` / `2FA Disabled`, default off), and three static help sections. When 2FA is enabled, a **Verification method** radio group appears (Email / SMS / Both). ⛔ The toggle and method flip local flags only — nothing is wired behind them.

---

## Project 3 — Permission Sets

> **Part of this handoff.** Permission Sets was previously delivered on its own and thought complete; it's since come back into scope, which is why its full catalog and editor now live in this prototype. It's still a distinct project — separate from Agent Management, even though its UI sits there — so this section is the **boundary**: what it is, its data model, and how it wires into the rest.

### 3.1 What it is

A catalog of **permission sets** — named capability bundles assigned to agents (per module) and to teams. It has two views inside Agent Management: a **table** of all sets, and a full-area **editor** for one set.

### 3.2 The data model

A permission set has: an id and name; a `moduleId` (or null = system-wide); a `type` of `System` or `Custom`; a locked flag; an optional global-only flag; an optional description and department list; its assigned users and teams; a `capabilities` map (each permission id → a toggle or a segment value like `View`/`Manage`); and a last-updated timestamp.

**8 seed sets:**

| name | type | module | locked |
|---|---|---|:--:|
| Global Admin | System | — | ✓ |
| Department Admin | System | — | ✓ |
| Global User | System | — | ✓ |
| Team Member | System | — | |
| Recorder | System | — | |
| Read Only | System | — | |
| IT Desk Lead | Custom | IT | |
| Classic Triage | Custom | Classic | |

- **System sets open read-only** (all six of them).
- **Global Admin** (renamed from *System Administrator*) is a **global-tier** set — it appears only in the Global context and exposes only district config. **Department Admin** is the department-tier admin set. The switcher maps a module role to one of these: Admin → Department Admin, Agent → Team Member.
- **Any set created in the Global context is global-tier.**
- **The capability catalog** (`permission-catalog.ts`) holds **123 permissions** (68 Actions + 55 Settings) in two groups, **Actions** (Tickets, Assets, Analytics, Campaigns) and **Settings** (Global · General · Integration Hub · Automations · Tickets · Assets · Call Center), ported from the Figma Make prototype. Each system set renders from a read-only **role preset** (five presets cover the six system sets — Department Admin reuses the Global User preset). Every section/permission can be tagged **global-tier** or **department-tier**; the editor uses those tags to show the right subset (see [§3.4](#34-permission-set-editor)).

### 3.3 Permission Sets tab

✅ built / 🟡 data

- **Action:** `Create permission set` opens a small modal asking for a **name**, a **description**, and an optional **Copy From** (there's no visible Department field — the current context is applied implicitly). On Create it validates the required name (blank → `Please fill in the required fields highlighted below.` plus the field helper `Name is required.`); the set is added — **marked global-tier if created in the Global context** — and its editor opens.
- **Search:** `Search permission sets…`. **Columns:** **Name, Type** (System = blue, Custom = grey)**, Agents** (count assigned, context-scoped)**, Last Updated.**
- **Context-scoped** ✅ — the Global context shows only the global-tier set (Global Admin); a department shows the system-wide sets plus its own custom sets, hiding Global Admin.
- **Clicking a row** opens the editor. No kebab menu.

### 3.4 Permission Set editor

✅ built / 🟡 save in-memory

Opens **full-area, replacing the tab bar**, and collapses the subnav. A faithful port of the Figma Make config flow.

- **Layout** — a back-affordance, the set name (with a `System` badge on System sets), and the tab bar live in the page heading. **Save Changes / Discard** sit in a **bottom save bar** that appears whenever there are unsaved changes (it reads `You have unsaved changes`) — including buffered assignment edits.
- **Tabs:** **Details · Data Visibility · Actions · Settings** — except **global-tier sets show only Details + Settings** (Data Visibility and Actions are dropped).
- **Details** — name, description, and **Assigned Teams and Agents**, derived from live data (it matches the table's Agents count). Members are **removable chips**, and an **Add Agents** menu (searchable) adds more. Add/Remove are **buffered** — they mark the editor dirty and commit on Save or revert on Discard. 🟡 They don't truly persist.
- **Data Visibility** — Tickets and Assets scopes (All / Assigned) plus an Assets **filter builder** (Asset Type / User Type / Grade multi-selects, each with an Exclude option and a live helper). **Hidden for global-tier sets.**
- **Actions & Settings** — both render the same matrix (a section nav + search on the left, a permission grid on the right). Each row is a toggle or a segment (`Hide`/`View`/`Manage`, or `…`/`Edit`); a `Manage` segment reveals sub-checkboxes; each section has presets (`No Access` / `View Only` / `Full Access` / `Custom`). **A global-tier set** shows only the district-wide Settings sections (Global, Integration Hub, Call Center) and no Actions tab; **a department set** shows only the department-tier sections (General, Automations, Tickets, Assets).
- **Save** 🟡 — in-memory, with a success toast `Permission set saved.` A blank name triggers the **save-bar error** (not a toast) — `Fix the required fields before saving.` — jumps to Details, and flags `Name is required.` on the field. On a **read-only system set**, Save only commits buffered assignment edits (name/description/capabilities stay locked). ⛔ A "duplicate to an editable copy" path exists in code (`{name} (copy)`) but isn't wired to any button yet.
- ⚠️ **Capability vocabulary** — the seed sets store *legacy* permission keys, while the catalog uses new ids; the editor rewrites legacy → catalog ids on save. Production needs a real schema and a migration.

### 3.5 The single source of truth

There's **one permission-sets dataset**. Sets are referenced **by id** everywhere, and read by **eight surfaces** — most resolve id → name; the editor's assigned-list does the reverse:

| Surface | Reads | Resolves to |
|---|---|---|
| Agents table — Permission Sets column ([§2.1](#21-agents-tab)) | a user's per-module assignment | set names (joined) |
| Agent profile — Permissions tab ([§2.2](#22-agent-profile)) | the assignment for one module | set name per module |
| Create/Edit Agent form ([§2.3](#23-create-and-edit-agent-form)) | the catalog | dropdown options |
| Teams table — Permission Set column ([§2.4](#24-teams-tab)) | a team's permission set | set name (or `None`) |
| Create Team form ([§2.5](#25-create-and-edit-team-form)) | the catalog | dropdown options |
| Permission Set editor ([§3.4](#34-permission-set-editor)) | the catalog | **the one writer** |
| Editor — Assigned Users & Teams ([§3.4](#34-permission-set-editor)) | assignments (reverse lookup) | the agents/teams on a set |
| Department switcher role label ([§1.2](#12-the-department-switcher-top-nav)) | the catalog | role → set name |

All eight stay wired to that one dataset, the editor is the only writer, and there is **no delete** (the capability exists in code but has no UI).

### 3.6 Settings permissions ↔ the product Settings nav

⛔ **A spec for engineering — not active in the prototype yet.**

The **Settings** half of the permission catalog is meant to mirror the product's **Settings sidebar** exactly: the **same seven sections in the same order** (Global · General · Integration Hub · Automations · Tickets · Assets · Call Center), **one permission per nav item**. The granted level gates that item for the user: **Hide** → not shown, **View** → read-only, **Manage/Edit** → editable. A sub-group (e.g. Topic Manager) gates as a unit.

**The two lists must stay in lockstep** — add or rename a nav item and you add or rename the matching permission, so the mapping stays 1:1. In the prototype the sidebar is static (only Department Modules and Agent Management are real pages) and the permission set is mocked, so nothing actually hides today. `<!-- TODO eng: gate each settings nav item on the active set's value -->`

**Tier mirrors context:** the global-tier sections (Global, Integration Hub, Call Center) are the Global-context-only settings; the department-tier sections (General, Automations, Tickets, Assets) are what a department admin manages. This is the same global/department split the editor applies in [§3.4](#34-permission-set-editor). (Implementation note: when Global was split into Global + General, the General permissions kept their original `gl-` id prefix so the role presets stay valid.)
