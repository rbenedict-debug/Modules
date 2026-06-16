# Unified User Management Port — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the figma-make-prototype's user management, profiles, teams, permission sets, and ticket inbox into this Angular + Onflo project as one unified design-mode app, with module-context switching + role gating in place of the source's departments.

**Architecture:** A shared mock-data foundation (signals-based services + a `ModuleContextService`) is built first and is the single source of truth. The shell gains a module switcher and role gating. User Management is a new routed page under Settings with Users/Teams/Permission Sets tabs + a Profile drawer; Ticket Inbox lives under the Tickets nav. Five features are then built as isolated components that all read the foundation services, so they can be developed in parallel.

**Tech Stack:** Angular 21 (standalone components, signals, control-flow `@if/@for`), Onflo Design System **design mode** (CSS class API only — no Material/AG Grid/Highcharts imports, no `Ds*Component`), DS table runtime (`table-init.js` + `table-sim.css`).

**Verification model (design mode):** This is a visual prototype with no unit-test suite for pages. Each task's "test" is: `npm run build` compiles clean **and** the design-mode contract holds (no forbidden imports, tokens not hardcoded, `:focus-visible` rings, page `<h1>` present). Where genuine eng is needed, leave a `<!-- TODO eng: … -->`.

---

## File structure

```
src/app/data/                         ← NEW shared foundation
  models.ts                           interfaces + enums (the contract)
  modules.service.ts                  Module list (seeded from Department Modules)
  module-context.service.ts           current module + derived flags/gating
  users.service.ts                    User[] signal + CRUD
  teams.service.ts                    Team[] signal + CRUD
  permission-sets.service.ts          PermissionSet[] + permission catalog
  tickets.service.ts                  Ticket[] signal
src/app/components/
  module-switcher/                    NEW top-nav switcher (ds-menu)
src/app/pages/settings/user-management/
  user-management.component.{ts,html,scss}    tabbed shell (Users/Teams/Permission Sets)
  users-tab/                          Users grid + create/edit/delete + profile trigger
  user-profile-drawer/                right-side drawer, 5 tabs
  teams-tab/                          Teams grid + create/edit + members
  permission-sets-tab/                list + full-screen matrix editor
src/app/pages/tickets/                EXISTING stub → Ticket Inbox
```

Shared files touched only in **Phase 0** (so Phase 1 feature agents never contend):
`angular.json`, `src/app/app.routes.ts`, `src/app/app.html`, `src/app/app.ts`, `src/app/app.scss`.

---

## Phase 0 — Foundation (sequential; blocks all of Phase 1)

### Task 0.1: Domain models

**Files:** Create `src/app/data/models.ts`

- [ ] **Step 1: Write the interfaces and enums** (this is the contract every later task imports)

```ts
// src/app/data/models.ts

export type UserStatus = 'Active' | 'Unverified' | 'Inactive' | 'Pending';
export type UserSource = 'Manual' | 'SIS' | 'Active Directory' | 'Google' | 'Azure';
export type UserRole =
  | 'Agent' | 'District Admin' | 'School Admin' | 'Staff' | 'Teacher' | 'Parent' | 'Student';

export interface User {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone?: string;
  status: UserStatus;
  source: UserSource;
  roles: UserRole[];
  modules: string[];        // Module ids
  teams: string[];          // Team ids
  locations: string[];
  topics: string[];
  grade?: number;
  jobTitle?: string;
  employeeId?: string;      // custom field
  pronouns?: string;        // custom field
  emergencyContact?: string;// custom field
  permissionSetByModule: Record<string, string>;  // moduleId -> PermissionSet id
  lastLogin?: string;       // ISO date
  dateAdded: string;        // ISO date
}

export type ModuleRole = 'Admin' | 'Agent';
export type ModuleAccent =
  | 'blue' | 'green' | 'grey' | 'navy' | 'orange' | 'pink' | 'purple' | 'red' | 'teal' | 'yellow';

export interface Module {
  id: string;
  name: string;
  icon: string;             // Material Symbol
  accent: ModuleAccent;
  role: ModuleRole;         // current user's role in this module
  ticketCount: number;
  active: boolean;          // owned vs available (mirrors Department Modules)
}

export type TeamSource = 'Manual' | 'Active Directory' | 'Azure' | 'Google';
export interface Team {
  id: string;
  name: string;
  modules: string[];        // Module ids
  topics: string[];
  memberIds: string[];      // User ids; memberCount = memberIds.length
  permissionSetId?: string; // undefined = None
  source: TeamSource;
}

export type PermissionSetType = 'System' | 'Custom';
export interface PermissionSet {
  id: string;
  name: string;
  moduleId: string | null;  // null = system-wide
  type: PermissionSetType;
  isLocked: boolean;        // built-ins (Global Admin, Module Admin) are locked
  capabilities: Record<string, boolean | string>;  // permissionId -> toggle(bool)/segment(string)
}

export type TicketPriority = 'P1' | 'P2' | 'P3';
export type TicketStatus = 'Unopened' | 'In Progress' | 'Waiting' | 'Closed';
export type CustomerRole = 'Student' | 'Faculty' | 'Staff' | 'Parent/Guardian';
export interface Ticket {
  id: string;
  number: string;
  subject: string;
  description: string;
  customerName: string;
  customerRole: CustomerRole;
  priority: TicketPriority;
  status: TicketStatus;
  ownerName: string;
  moduleId: string;
  receivedAt: string;       // ISO date
  isMyTicket: boolean;
  isMyTeam: boolean;
}

/** Source-locked fields render read-only with a sync icon for non-Manual sources. */
export const SOURCE_LOCKED_FIELDS: Record<UserSource, (keyof User)[]> = {
  'Manual': [],
  'SIS': ['firstName', 'lastName', 'email', 'status'],
  'Active Directory': ['firstName', 'lastName', 'email', 'status'],
  'Google': ['firstName', 'lastName', 'email', 'status'],
  'Azure': ['firstName', 'lastName', 'email', 'status'],
};

export function fullName(u: User): string {
  return [u.firstName, u.middleName, u.lastName].filter(Boolean).join(' ');
}
```

- [ ] **Step 2: Verify it compiles.** Run: `npm run build` — Expected: PASS (no usages yet, just type-checks).
- [ ] **Step 3: Commit.** `git add src/app/data/models.ts && git commit -m "feat(data): add domain models for user management"`

### Task 0.2: Modules service + ModuleContextService

**Files:** Create `src/app/data/modules.service.ts`, `src/app/data/module-context.service.ts`

- [ ] **Step 1: modules.service.ts** — seed from the Department Modules list (same names/icons/accents). Current user is Admin in Classic + Transportation, Agent in IT/HR/Facilities.

```ts
import { Injectable, signal } from '@angular/core';
import { Module } from './models';

@Injectable({ providedIn: 'root' })
export class ModulesService {
  readonly modules = signal<Module[]>([
    { id: 'classic',        name: 'Classic',        icon: 'star',           accent: 'blue',   role: 'Admin', ticketCount: 24, active: true },
    { id: 'transportation', name: 'Transportation', icon: 'directions_bus', accent: 'yellow', role: 'Admin', ticketCount: 8,  active: true },
    { id: 'it',             name: 'IT',             icon: 'computer',       accent: 'purple', role: 'Agent', ticketCount: 12, active: false },
    { id: 'hr',             name: 'HR',             icon: 'groups',         accent: 'orange', role: 'Agent', ticketCount: 3,  active: false },
    { id: 'facilities',     name: 'Facilities',     icon: 'apartment',      accent: 'teal',   role: 'Agent', ticketCount: 5,  active: false },
  ]);
}
```

- [ ] **Step 2: module-context.service.ts** — the global context store + gating flags.

```ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { ModulesService } from './modules.service';

@Injectable({ providedIn: 'root' })
export class ModuleContextService {
  private readonly modulesSvc = inject(ModulesService);
  private readonly _currentModuleId = signal<string | null>(null); // null = Global

  readonly currentModuleId = this._currentModuleId.asReadonly();
  readonly isGlobal = computed(() => this._currentModuleId() === null);
  readonly currentModule = computed(() =>
    this.modulesSvc.modules().find(m => m.id === this._currentModuleId()) ?? null);
  readonly isAgentRole = computed(() => !this.isGlobal() && this.currentModule()?.role === 'Agent');

  // Capability flags (mirror source DepartmentContext)
  readonly canManageUsers = computed(() => this.isGlobal() || this.currentModule()?.role === 'Admin');
  readonly canCreateUsers = computed(() => this.isGlobal());
  readonly canEditModuleAssignment = computed(() => this.isGlobal());
  readonly canAdminActions = computed(() => this.isGlobal() || this.currentModule()?.role === 'Admin');

  select(moduleId: string | null): void { this._currentModuleId.set(moduleId); }
}
```

- [ ] **Step 3:** `npm run build` — Expected: PASS.
- [ ] **Step 4: Commit.** `git commit -am "feat(data): add modules + module-context services"`

### Task 0.3: Mock data services (users, teams, permission sets, tickets)

**Files:** Create `users.service.ts`, `teams.service.ts`, `permission-sets.service.ts`, `tickets.service.ts` in `src/app/data/`

- [ ] **Step 1:** Each service is `@Injectable({providedIn:'root'})`, holds a `signal<T[]>` seeded with representative mock data, and exposes CRUD + query helpers. Required public APIs (later tasks depend on these exact names):

```ts
// users.service.ts
class UsersService {
  readonly users: WritableSignal<User[]>;            // ~32 seeded users across all 5 modules
  add(u: Omit<User,'id'>): void;
  update(id: string, patch: Partial<User>): void;
  remove(ids: string[]): void;
  byModule(moduleId: string | null): User[];         // null = all
}
// teams.service.ts
class TeamsService {
  readonly teams: WritableSignal<Team[]>;            // ~6 seeded teams
  add(t: Omit<Team,'id'>): void;
  update(id: string, patch: Partial<Team>): void;
  remove(ids: string[]): void;
  byModule(moduleId: string | null): Team[];
}
// permission-sets.service.ts
class PermissionSetsService {
  readonly sets: WritableSignal<PermissionSet[]>;    // System: System Administrator, Global User, Team Member, Recorder, Read Only + a couple custom
  add(s: Omit<PermissionSet,'id'>): void;
  update(id: string, patch: Partial<PermissionSet>): void;
  remove(ids: string[]): void;
}
// NOTE: the permission *catalog* (section/permission definitions + PermissionSection/PermissionDef
// types) is added to THIS file by Task 4 — it is not part of the Phase 0 contract, so nothing in
// Phase 0 references it. Task 4 is the only task that edits this file's internals.
// tickets.service.ts
class TicketsService {
  readonly tickets: WritableSignal<Ticket[]>;        // ~40 seeded tickets across modules, mix of my/team/all/closed
  byModule(moduleId: string | null): Ticket[];
}
```

Seed data must be internally consistent: every `User.teams`/`modules`/`permissionSetByModule` id and every `Team.memberIds`/`permissionSetId` id must reference real seeded records. Use plain string ISO dates (no `Date.now()`).

- [ ] **Step 2:** `npm run build` — Expected: PASS.
- [ ] **Step 3: Commit.** `git commit -am "feat(data): add users/teams/permission-sets/tickets mock services"`

### Task 0.4: angular.json — DS table runtime

**Files:** Modify `angular.json` (build target `options`)

- [ ] **Step 1:** Confirm the asset filenames exist in `node_modules/@onflo/design-system/` (this version ships `dist/onflo-design.css`): verify `runtime/table-init.js` and the table-sim stylesheet name in `dist/` (likely `table-sim.css`). Use the confirmed names.
- [ ] **Step 2:** Add `table-init.js` to `scripts` (after `select.js`) and the table-sim CSS to `styles` (after `onflo-design.css`):

```jsonc
"styles": [
  "node_modules/@onflo/design-system/dist/onflo-design.css",
  "node_modules/@onflo/design-system/dist/table-sim.css",   // confirm exact name
  "src/styles.scss"
],
"scripts": [
  "node_modules/@onflo/design-system/runtime/focus-ring.js",
  "node_modules/@onflo/design-system/runtime/select.js",
  "node_modules/@onflo/design-system/runtime/table-init.js"
]
```

> This is the DS's own **design-mode** table runtime — allowed and required by the table pattern. NOT an eng dependency. Do not add Material/AG Grid/Highcharts.

- [ ] **Step 3:** `npm run build` — Expected: PASS (assets resolve).
- [ ] **Step 4: Commit.** `git commit -am "build: wire DS table runtime (table-init.js + table-sim.css)"`

### Task 0.5: Module switcher component (top-nav)

**Files:** Create `src/app/components/module-switcher/module-switcher.component.{ts,html,scss}`; read `node_modules/@onflo/design-system/.claude/examples/menu.html` and `top-nav.html` first.

- [ ] **Step 1:** Build a standalone component: a trigger button (current module icon + name + caret; shows "Global" when `isGlobal`) that opens a `ds-menu` with a **Context** section (Global Admin) and a **Modules** section (one `ds-menu__item` per module: accent icon, name, `ds-label` Admin/Agent tag, `ds-badge-indicator` ticket count), plus the footer hint "Switching context changes visible data." Clicking an item calls `ModuleContextService.select(...)`. Close on outside-click/Escape (mirror the existing `profile-menu` pattern in `app.ts`). Tokens only; `:focus-visible` rings.
- [ ] **Step 2:** `npm run build` — Expected: PASS.
- [ ] **Step 3: Commit.** `git commit -am "feat(shell): add module switcher component"`

### Task 0.6: Wire switcher + role gating into the shell

**Files:** Modify `src/app/app.html`, `src/app/app.ts`, `src/app/app.scss`

- [ ] **Step 1:** Import `ModuleSwitcherComponent` into `App`; place `<app-module-switcher />` as the **first child** of `<div class="ds-top-nav__actions">`. Inject `ModuleContextService`.
- [ ] **Step 2:** Role gating: bind the **Analytics** and **Settings** nav buttons with `@if (!moduleCtx.isAgentRole())`. In `setNav` / the router sync, if `isAgentRole()` and target is `analytics`/`settings`, redirect to `tickets`.
- [ ] **Step 3:** `npm run build` — Expected: PASS; manual: switcher renders in top-nav, switching to an Agent module (IT/HR/Facilities) hides Settings + Analytics.
- [ ] **Step 4: Commit.** `git commit -am "feat(shell): wire module switcher + agent-role nav gating"`

### Task 0.7: User Management route + tabbed page scaffold + feature stubs

**Files:** Modify `src/app/app.routes.ts`, `src/app/app.html` (settings subnav); create `user-management.component.{ts,html,scss}` and **empty stub components** for `users-tab`, `user-profile-drawer`, `teams-tab`, `permission-sets-tab` so Phase 1 agents fill isolated files. Read `.claude/examples/inner-page-tabs.html`.

- [ ] **Step 1:** Add route under `settings` children: `{ path: 'user-management', component: UserManagementComponent }`. Wire the existing subnav button (`app.html` line ~308–310) to `(click)="goSettings('user-management')"`.
- [ ] **Step 2:** `UserManagementComponent`: host `ds-page-content`, `<h1 class="ds-page-content__title">User Management</h1>`, a `ds-inner-page-tabs` bar (Users / Teams / Permission Sets) driving a local `signal<'users'|'teams'|'permission-sets'>`, and `@switch` rendering `<app-users-tab>` / `<app-teams-tab>` / `<app-permission-sets-tab>`. Include `<app-user-profile-drawer>` at the end (hidden by default).
- [ ] **Step 3:** Create the four child components as **minimal stubs** (selector + empty template with a placeholder `<div>`), standalone, so they compile and Phase 1 can replace their internals without touching each other.
- [ ] **Step 4:** `npm run build` — Expected: PASS; manual: Settings → User Management routes and shows three empty tabs.
- [ ] **Step 5: Commit.** `git commit -am "feat(user-mgmt): add route + tabbed page scaffold + feature stubs"`

---

## Phase 1 — Features (parallel; each touches only its own component folder)

> Every Phase 1 task reads the Phase 0 services for data, uses **only** the CSS class API, reads the named `.claude/examples/*.html` before writing markup, ports behavior/fields from the named source file, and finishes with `npm run build` PASS + a commit. Source root: `~/Developer/VSCode Claude Code/figma-make-prototype/src/components/`.

### Task 1: Users tab
**Files:** `users-tab/users-tab.component.{ts,html,scss}` · Port from `UserManagement.tsx` · Examples: `table-starter.html` (copy via `cp`), `modal.html`, `select.html`, `input.html`, `radio.html`, `label.html`, `chip.html`.
- [ ] Interactive grid via the **table-starter pattern** (copy `preview/table-starter.html`, strip wrapper tags, move `initTable` config into `ngAfterViewInit`, `cdr.detach()`). Columns: Name (+email), Roles (chips +N), Status (badge), Module(s), Teams, Locations, Phone, Source, Job Title, Last Login, Date Added. Categorical filters: Status/Roles/Module/Teams/Locations/Source.
- [ ] Rows from `UsersService.byModule(moduleCtx.currentModuleId())` (reactive to switcher). When not Global, suppress the Module column.
- [ ] Toolbar CTA **Create User** → `ds-modal` form (First/Middle/Last, Email, Phone, Employee ID, Job Title, Modules [hidden when scoped], Locations, Activation radio). Mock validation (`.is-error` + `role="alert"`).
- [ ] Row actions Edit / Delete / View Profile; bulk delete with confirm `ds-dialog`. Export CSV button → `<!-- TODO eng: CSV export -->`.
- [ ] "View Profile" calls a shared method to open the profile drawer (see Integration). `npm run build` PASS → commit.

### Task 2: User Profile drawer
**Files:** `user-profile-drawer/*` · Port from `UserProfile.tsx` · Examples: `tabs.html`, `input.html`, `select.html`, `label.html`, `chip.html`, `avatar.html`, `scrollable-panel.html`.
- [ ] Right-side drawer (fixed panel + scrim, toggled by an `@Input`/signal `userId`). Header: avatar initials, name, status badge, email, Edit/Save/Cancel.
- [ ] Tabs: **Details** (System + Custom field columns; inline edit; fields in `SOURCE_LOCKED_FIELDS[user.source]` render read-only with a sync `ds-icon`), **Permissions** (card per assigned module: icon/name, permission-set `ds-label`, team chips; non-agent → "Non-agent users are not assigned module-level permissions"), **Tickets** (filter All/Open/Closed + search + list from `TicketsService`), **Assets** (search + mock list), **Activity** (dated timeline).
- [ ] Reads `UsersService`; edits call `UsersService.update`. `npm run build` PASS → commit.

### Task 3: Teams tab
**Files:** `teams-tab/*` · Port from `TeamsTab.tsx` · Examples: `table-starter.html`, `modal.html`, `select.html`, `input.html`, `avatar.html`, `label.html`.
- [ ] Interactive grid (table-starter pattern). Columns: Team Name, Module(s), Topics, Member Count, Permission Set, Source. Categorical filters: Module/Topics/Source. Rows from `TeamsService.byModule(...)`.
- [ ] CTA **Create Team** → `ds-modal` (Name, Modules [hidden when scoped], Topics, Permission Set single+None, Members: searchable user picker + member list w/ remove). Edit reuses it.
- [ ] Row actions Edit / View Members / Delete. View Members → side panel (avatar/name/email/status). Delete → confirm `ds-dialog`. `npm run build` PASS → commit.

### Task 4: Permission Sets tab + editor
**Files:** `permission-sets-tab/*` · Port from `PermissionSetConfig.tsx` · Examples: `toggle.html`, `radio.html`, `checkbox.html`, `card.html`, `label.html`, `search.html`, `subnav-button.html`.
- [ ] Define the catalog schema in `permission-sets.service.ts` (`catalog: PermissionSection[]`): sections **Tickets, Assets, Analytics, Campaigns, Global, Workflows, Integrations**; each `PermissionDef` = `{ id, label, description?, controlType:'toggle'|'segment', segmentOptions?, subGroup?, accessTier?, notes? }`. Mock at **representative depth** (~6–10 perms per section, not every leaf — log what's abbreviated).
- [ ] **List view:** permission sets (name, type System/Custom, module scope, locked indicator), Create CTA; click → editor. Locked/System sets open read-only.
- [ ] **Editor (full-screen within the tab):** left section nav (icons + search + preset color dot); right content = collapsible sub-groups of permission rows, each a `ds-toggle` or a segmented control (build segmented control from buttons styled with tokens; Hide/View/Manage), Manage→Create/Edit/Delete checkboxes. Section presets No Access/View Only/Full Access/Custom. Data Visibility block (Tickets All/Assigned, Assets All/Assigned Locations + exclude toggles).
- [ ] Read-only mode disables all controls. `npm run build` PASS → commit.

### Task 5: Ticket Inbox
**Files:** `src/app/pages/tickets/tickets.component.{ts,html,scss}` (replace stub) · Port from `TicketInbox.tsx` · Examples: `table.html`, `tabs.html`, `search.html`, `avatar.html`, `label.html`.
- [ ] Replace the stub body. Tabs **My Tickets / My Team / All Tickets / Closed** + keyword search + footer count. Use a simple `<table class="ds-table">` (NOT the heavy grid) with columns: select, Subject (+preview), Customer (name + role `ds-label`), Priority (P1/P2/P3), Status, Owner (avatar+name), Received (time + elapsed).
- [ ] Rows from `TicketsService.byModule(moduleCtx.currentModuleId())` filtered by the active tab (`isMyTicket`/`isMyTeam`/status Closed/all). Keep the existing page `<h1>` and shell. `npm run build` PASS → commit.

---

## Phase 2 — Integration + verification

### Task 6: Cross-feature wiring + full verification
**Files:** `user-management.component.ts` (+ minor touches to tabs/drawer)
- [ ] Wire **open Profile from Users tab** (Users emits a userId → UserManagement opens the drawer). Wire **open Permission editor** from the Permissions tab "edit" and from the Permission Sets list. Confirm the module switcher reactively re-scopes Users/Teams/Tickets.
- [ ] `npm run build` — Expected: PASS, no warnings about hardcoded styles budget.
- [ ] **Design-mode lint pass:** grep the new code for forbidden patterns — `@angular/material`, `ag-grid`, `highcharts`, `Ds[A-Z].*Component` imports, `mat-` directives, hex colors / raw `px` in SCSS, `:focus` without `-visible`. Fix any hit.
- [ ] Run the **code-review** skill over the diff; address correctness findings.
- [ ] Final commit: `git commit -am "feat(user-mgmt): integrate features + module-scope wiring"`.

---

## Out of scope
Source Departments page (replaced by Department Modules); real persistence/API/auth; reactive-form validation; AG Grid/live charts (mock + `<!-- TODO eng -->`); Assets/Analytics page bodies; engineering-mode conversion.
