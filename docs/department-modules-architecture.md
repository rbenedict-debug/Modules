# Department Modules — Technical Architecture

**Date:** 2026-06-17 · **Branch:** `unified-user-management-port` · **Status:** Draft for engineering handoff

> Technical reference for the **Department Modules** page and the **top-nav switcher** — how the
> prototype is wired, what's built vs. mocked vs. planned, and where it meets User Management.
> Decisions still needed are at the [end](#open-questions--need-clarification).

---

## Purpose & scope

**In scope:** the **Department Modules page** (`/settings/department-modules`) and the **top-nav module
switcher**. The **persona swapper** (⌘K / Ctrl+K) is just the tool for *exploring* the prototype as
different users — not separate scoped work.

**Out of scope:** **User Management** — a separate, already-handed-off project that owns permissions
and module assignment. Its connection points are in [§3](#3--user-management-connection).

### Status legend

| | Meaning |
|---|---|
| ✅ | **Built** and working in the prototype |
| 🟡 | **Mocked** — works, but static / in-memory (design mode) |
| ⛔ | **Planned** — not built yet |

### Where things live (under `src/app/`)

| File | Role |
|---|---|
| `data/models.ts` | Shared interfaces (`Module`, `Persona`, `ModuleRole`, …) |
| `data/modules.service.ts` | **Single source of truth** for the modules |
| `data/persona.service.ts` | Demo personas + the active one |
| `data/module-context.service.ts` | Derives the view (module access, switcher, nav gating) from the active persona |
| `data/messaging.service.ts` + `components/snackbar-host/` | App-wide toast system |
| `components/module-switcher/` | The top-nav switcher |
| `components/command-palette/` | The ⌘K persona swapper |
| `pages/settings/department-modules/` | The Department Modules page |
| `app.ts` · `app.html` · `app.routes.ts` | Shell: routing, nav gating, theme |

---

## Global / overall

### Success & error messaging ✅

One app-wide toast system — `MessagingService` → a single top-center `SnackbarHostComponent` mounted
in the shell. Used by the Department Modules request ([§1](#1--department-modules-page)) and the
switcher ([§2](#2--department-switcher-top-nav)).

- **Success toast** — top-center, auto-dismisses after **3s**, manual Dismiss (×).
- **Error toast** — leading error icon + **Retry** + Dismiss; **never auto-dismisses**.
- **In-modal failures** show a DS error alert (`ds-alert--error`) at the top of the open dialog instead — the dialog stays open and its primary button retries.
- **Demo:** mock actions always succeed, so **hold Shift while clicking** simulates a failure (`event.shiftKey`).
- ⚠️ **DS gap** — the DS snackbar has no error variant; failures reuse the text-action shell + a tinted `error` icon. Flag as a DS candidate.
- ⛔ **Production** — drive success/failure from the real result; replace the Shift-simulate with real error handling.

### Timeout / session messaging ⛔

No session, idle, or auth-timeout handling exists yet. (Existing `setTimeout`s are UI timing only —
toast dismissal, submit latency, scrollbar — not session timeouts.) Placeholder for session-expiry
messaging, request timeouts, and retry-on-timeout.

---

## 1 — Department Modules page

**Route:** `/settings/department-modules` (the app's default landing page) · **Files:** `pages/settings/department-modules/`

**What a department module is:** a **divider** that splits one account into departments that share the
same system but not each other's work. Each department's tickets route to its own divider (a Classic
agent never sees IT tickets), keeping views clean — yet work still flows across (a Classic ticket can
hand off to IT), and **integrations are shared** (one SIS serves every department).

This page is where an admin **sees the modules they have, browses available/upcoming ones, and requests
new ones**.

### Data & layout ✅

Modules come from **`ModulesService`** (single source of truth); the page only layers transient request
state (`pending`) on top, so cards always match the switcher. Three groups:

- **Active** — what the account owns (`active` modules), plus anything pending (a real module or custom request under review).
- **Available** — released prebuilt modules not yet added (requestable), plus the **Custom module** request card.
- **Coming soon** — unreleased prebuilt modules: a muted preview with a `Coming soon` label and no request button.

**Prebuilt set** (all but custom): **Classic, Transportation, IT, HR, Facilities**. Only **Classic**
(Active — the base) and **IT** (Available) are released today; **Transportation, HR, Facilities** show
`Coming soon`. A `comingSoon` flag on `Module` drives the split.

### What's included in each module ✅

`Module.features` is the source of truth for a module's contents — build to these:

| Feature | Classic | IT | Custom |
|---|:--:|:--:|:--:|
| Service desk ticketing | ✓ | ✓ | ✓ |
| Dashboard analytics | ✓ | ✓ | — |
| Workflow automation and routing | ✓ | ✓ | — |
| Asset management | — | ✓ | ✓ |

- **Custom** is intentionally lightweight (ticketing + assets only); **every** custom module shares this exact set (`CUSTOM_MODULE_DEFAULTS`) — only the name differs.
- **Coming soon** modules carry a *planned* feature list (Transportation/HR mirror Classic, Facilities mirrors IT) — **not final**.

### Relationship to the switcher

The switcher ([§2](#2--department-switcher-top-nav)) only ever lists **`active`** modules — Available
and Coming soon modules never appear there. Whether a user sees the switcher, and which modules, is
role-dependent (assigned in User Management — [§3](#3--user-management-connection)).

🟡 In the prototype this is driven by the active **persona** (via ⌘K), not an `active` filter — see
[Open questions](#open-questions--need-clarification).

### The request flow ✅ (🟡 persistence mocked)

**Request department module** opens a confirmation dialog:

- **Real module** → confirm → added to `pendingIds`; the card moves to **Active** under an *Under review* overlay.
- **Custom module** → a required name field → spawns a named pending copy; the reusable card stays in Available. ⛔ Requests are **uncapped today**; a cap is coming (how is TBD).
- **Submit** — `Send request` → `Sending...` (~600ms), then a success toast `Request submitted for "[name]".`, or on failure an in-dialog error `Couldn't send your request. Please try again.` (`Send request` retries). Toast system + Shift-to-simulate: [Global](#success--error-messaging-).
- 🟡 In-memory only (resets on refresh); the request dialog is a static mock (no focus trap or Escape-to-close).

### Lifecycle & turning modules on/off ⛔ (in design)

Today: **request → our team sets it up → Active**. Being designed into something more flexible — the
goals are set, the specifics still under discussion (see [Open questions](#open-questions--need-clarification)).

- **Goals** — activation won't always be a request (support request / self-serve / trial, swappable); reversible **on/off**; **trials** with easy revert; **removal always possible** (prebuilt or custom).
- **Requirement** — every change must be **reversible and lossless**: turning a module off, ending a trial, or removing it can't lose its data or disturb shared resources (integrations, users), and re-adding it restores the prior state. *How that's built is engineering's call.*
- **Proposed lifecycle (draft)** — `Coming soon → Available → Setting up → Active ⇄ Off → Removed (re-addable)`; `Trial → Keep / End`.

---

## 2 — Department switcher (top nav)

**Files:** `components/module-switcher/` · mounted in `ds-top-nav__actions`, gated by `@if (moduleCtx.showSwitcher())`.

### What it does ✅

The switcher **changes the user's view** — picking a module swaps the whole app (tickets, dashboards,
assets, …) into that module. Example: an Agent in **Classic + IT** sees Classic's areas while in
Classic; **swap to IT** and they see IT's, including **assets**. It only changes *which* module you're
in — *what* you can do there is set by your role/permissions in User Management ([§3](#3--user-management-connection)).

### When it appears ✅

- **Only for users with more than one module** (assigned in User Management). A single-module user (e.g. Agent in IT only) sees **no switcher**.
- **Global admins always see it.**
- **Only `active` modules appear** — never Available/Coming soon.

Prototype rule, against the active persona: `showSwitcher = isGlobalAdmin || availableModules.length > 1`.

### What it shows ✅

- **Trigger** — the current context: the module's accent **icon + name** (matching the Department Modules page exactly — same `ModulesService` entry), or a globe + "Global". A **custom module** is always the **gear icon + the admin-given name**.
- **Menu** — a **Global** row (global admins only); one row per assigned module with the user's **role** (`Admin` / `Agent`) under the name (roles can differ — Admin in one module, Agent in another); a check on the current one.

### The Global option (global admins only) ✅

A dedicated **Global** context — global admins only — to **manage all modules across the account** at
once. Non-global users never see it.

### Behavior ✅

- Selecting calls `ModuleContextService.select(...)`, closes the menu, and **re-renders the shell** into the chosen module (can trigger the agent-role redirect off Settings/Analytics).
- **Failed swap** → context stays put; error toast `Couldn't switch to [Module]. Please try again.` with Retry (Shift to simulate). See [Global](#success--error-messaging-).
- Open/close: outside-click + Escape. The component holds **no data of its own**.

---

## 3 — User Management connection

**User Management** is a **separate, already-handed-off project.** This section describes only **how the
two relate on the design side** — engineering plans the backend mapping.

It's **how modules and permissions are assigned to people**, turning the catalog into each user's actual
experience:

- **Module assignment** — which modules a user (or team) gets. This decides whether the switcher appears and which modules it lists.
- **Permissions & role per module** — the user's role (`Admin` / `Agent`) and what they can see and do, which can differ per module.

**How the pieces relate:** Department Modules defines *what modules exist and what's in them* → User
Management assigns *who gets which modules and their role in each* → the switcher and each module's views
render *what that user sees*. Department Modules and the switcher **reflect** what User Management has
assigned; they don't grant access themselves.

In the prototype, **personas** stand in for a signed-in user and their assignments (chosen via ⌘K); in
production that comes from the real user.

### What the permissions gate (visible areas)

What a user is assigned in User Management changes what's visible across the product — the switcher, the
**side nav**, and the **Settings** areas:

- **Side nav** — **Assets** shows only in a module that has Asset management (hidden in Classic, appears in IT); **Settings** shows only if the user's permissions allow; **Analytics** is hidden for agents.
- **Inside Settings** — each area is role-gated: **Global** is global-admins-only; a Classic-only admin can't see the Global or Assets areas.

In the prototype only the agent case is wired today (agents don't see Analytics/Settings); the rest is
intended design.

---

## Status summary — what's left to wire

| Area | Status | Note |
|---|---|---|
| Module catalog + Active/Available/Coming soon | ✅ | Single source of truth = `ModulesService` |
| Module request flow (incl. custom) | ✅ / 🟡 | Loading + success toast + in-dialog error; in-memory only |
| Switcher (visibility, contents, role labels, swap) | ✅ | Derived from the active persona |
| Success / error messaging | ✅ | Shared `MessagingService` + top-center snackbar |
| Nav gating + agent-role redirect | ✅ | Agents can't reach Settings/Analytics |
| Theme (light/dark, persisted) | ✅ | |
| Persona swapper (⌘K) | ✅ / 🟡 | Demo stand-in for the signed-in user |
| Switcher shows only `active` modules | ⛔ | Prototype is persona-driven (see Open questions) |
| Module lifecycle (on/off, trial, remove) | ⛔ | In design — pending decisions |
| Timeout / session messaging | ⛔ | None today |
| Request persistence + real submission | ⛔ | In-memory only |
| Permission gating (Assets/Settings/per-area) | ⛔ | Needs UM's permission model |
| Real auth replacing `PersonaService` | ⛔ | |
| Dialog focus trap + Escape-to-close | ⛔ | Request dialog is a static mock |

---

## Open questions — need clarification

1. **Switcher vs. active modules (prototype mismatch).** The rule is "the switcher shows only `active`
   modules," but the demo personas are assigned to modules that aren't active (IT, Transportation, HR,
   Facilities), so the rule isn't demonstrable as-is. Resolving it depends on the persona/assignment
   model (below).
2. **Module lifecycle** (in design — being reviewed with product/manager):
   - Is **"off"** a distinct paused state, or just **remove**?
   - When a **trial ends** un-kept — does its data **come back** if the module is added later, or is it **cleared**?
   - Which modules use which **activation method** (request / self-serve / trial)?
3. **Custom-module request cap.** Uncapped today; a cap is planned — the rule is TBD.
4. **User Management permission model.** The exact nav/Settings gating (Assets-by-module, per-area
   Settings, Global = global-admins-only) and per-module roles are owned by User Management's
   permission model, still being defined — the backend mapping is engineering's to plan.
