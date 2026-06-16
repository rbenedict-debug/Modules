# Unified User Management Port — Design Spec

**Date:** 2026-06-16
**Status:** Approved for planning
**Project:** Modules (Angular + Onflo Design System, **design mode**)

---

## 1. Overview & goal

Port the functionality of the `figma-make-prototype` (a React/Figma Make export
living at `~/Developer/VSCode Claude Code/figma-make-prototype`) into this Angular +
Onflo project so there is **one unified project** built entirely on the Onflo Design
System. The source's real substance is a **Unified User Management** system (users,
teams, permission sets, user profiles) plus a **Ticket Inbox**, all scoped by an
organizational context the source calls a "department."

This project already owns the **Department Modules** concept and **replaces** the
source's "Departments." So the source's standalone Departments page/feature is **not**
ported; instead, the source's *department-context behavior* is carried over renamed to
**module context**, tied to the existing Department Modules.

## 2. Context

### Source (do not modify — read-only reference)
- React 18 + Vite + Tailwind v4 + Radix + MUI + **AG Grid** + Recharts.
- Five substantial features (by weight): User Management (129 KB), Permission Set
  Config (99 KB), User Profile (88 KB), Teams (71 KB), Ticket Inbox (34 KB).
- Global state in `DepartmentContext`: a current department (or "Global"), role gating
  (agent vs admin), per-department permission sets, ticket counts.
- Architecture docs: `DEPARTMENT_ARCHITECTURE_SPEC.md`, `UNIFIED_USER_MANAGEMENT_SPEC.md`.

### Target (this project)
- Angular standalone components, Onflo **design mode** (CSS class API only).
- Shell, top-nav, theme toggle, and per-section subnavs are **already built** in
  `src/app/app.html` / `app.ts`.
- `Settings → Global → User Management` already exists as a subnav item but is **not
  routed** (only `department-modules` is wired via `goSettings`).
- Tickets subnav (Inbox / Bookmarks / Saved Views / Saved Searches) is already built.
- `tickets`, `assets`, `users`, `analytics` pages are empty stub components.
- `settings/department-modules` is fully built and is the **source of truth for the
  module list** (Classic, IT, HR, Transportation, Facilities, + custom).

### Hard constraints (from project `CLAUDE.md` / `AGENT-GUIDE-DESIGN.md`)
- **Design mode only.** No `@angular/material`, AG Grid, Highcharts, or `Ds*Component`
  imports. No editing `package.json` / `angular.json` / `CLAUDE.md` to enable eng deps.
- Tokens only (no hex/px/raw); `:focus-visible` + `box-shadow` focus rings; every page
  has `<h1 class="ds-page-content__title">`; dark mode via `data-theme` swaps tokens.
- Anything that genuinely needs eng (real AG Grid, live charts, reactive form
  validation) → closest **visual stand-in** + `<!-- TODO eng: … -->`.

### Translation rules (source → target)
| Source | Target (design mode) |
|---|---|
| AG Grid tables | Onflo table pattern (`runtime/table-init.js` + `table-starter.html`) — genuinely interactive (sort, filter, column panel) |
| MUI / Radix dialogs, drawers | `ds-dialog` / `ds-modal` toggled by component state |
| Recharts | inline SVG matching the Onflo chart theme + `<!-- TODO eng: replace with <ds-chart> -->` |
| MUI form controls | `ds-input`, `ds-select`, `ds-checkbox`, `ds-toggle`, `ds-radio` (wrapper markup — read `.claude/examples/{component}.html` first) |
| Material Symbols icons | `ds-icon` (Material Symbols Rounded — already the DS icon set) |

## 3. Decisions (confirmed with user)

1. **Module model: faithful context switcher.** Carry over the source's
   department-context behavior renamed to **module context** — a switcher in the
   top-nav, data scoped to the selected module, and agent-vs-admin **role gating**.
2. **User Management location: `Settings → User Management`.** Wire the existing
   (currently unrouted) `Settings → Global → User Management` subnav item to a new page.
3. **Scope: everything in one pass.** One combined spec covering all five features +
   module context + shared data foundation, built straight through.

### Sub-decisions (defaulted, approved)
- Teams & Permission Sets are **tabs inside the User Management page** (Users / Teams /
  Permission Sets), not separate settings pages.
- User Profile is a **right-side drawer** (faithful to source), not a full-page route.
- The module switcher's modules **= the Department Modules** (same names/icons/accents).
  Current user is **Admin** in Classic + Transportation; the rest are mocked as **Agent**
  or available.
- Faithful port, but **adapted to Onflo components** where they differ from the source's
  MUI/AG Grid look.

## 4. Information architecture & navigation

```
Shell (built) + NEW module switcher in ds-top-nav__actions (left of action buttons)
├─ Tickets        → Ticket Inbox            (subnav already built)
├─ Assets         → stub (untouched)
├─ Users          → stub (untouched — UM lives under Settings)
├─ Analytics      → stub; HIDDEN in agent-role modules
└─ Settings       → HIDDEN in agent-role modules
   ├─ Department Modules   (built — module source of truth)
   └─ User Management      ← NEW route: settings/user-management
      ├─ Users            (tab, default)
      ├─ Teams            (tab)
      └─ Permission Sets  (tab)
         └─ Permission Set editor (full-screen, opened from the tab)
      └─ User Profile drawer (opened from Users tab)
```

- New route: `{ path: 'user-management', component: UserManagementComponent }` under
  `settings`. Wire the existing subnav button's click to `goSettings('user-management')`.
- The tab state (Users / Teams / Permission Sets) is component-local (`ds-inner-page-tabs`).

## 5. Module context model

### 5.1 Switcher (top-nav)
- Lives inside `ds-top-nav__actions` (never a direct child of `<header>`), left of the
  existing action buttons. A trigger button (module icon + name + caret) opens a
  `ds-menu`.
- Menu contents (mirrors source department switcher):
  - **Context** group → `Global` (label "Global Admin").
  - **Modules** group → one row per module the current user belongs to (mocked as all
    five: Admin in Classic + Transportation, Agent in IT/HR/Facilities): icon (module
    accent), name, role tag (`ds-label` Admin/Agent), ticket-count `ds-badge-indicator`.
  - Footer hint: "Switching context changes visible data."
- Selecting a module updates the shared context; the active label shows in the trigger.

### 5.2 ModuleContextService (shared signal store)
State:
- `currentModuleId: string | null` (null = Global)
- derived `isGlobal`, `currentModule`, `isAgentRole` (true when the current module's role
  is Agent), and capability flags: `canManageUsers`, `canCreateUsers`
  (Global only), `canEditModuleAssignment` (Global only), `canAdminActions`.

### 5.3 Role gating (faithful to source)
- When `isAgentRole` is true: hide the **Settings** and **Analytics** primary-nav
  buttons and, if the user is on those sections, redirect to **Tickets**.
- In Global or an Admin module: full nav.
- Because User Management lives under Settings, agents inherently cannot reach it — this
  matches the source (agents do not manage users).

### 5.4 Module model (mock)
`Module { id, name, icon, accent, role: 'Admin' | 'Agent', ticketCount, active }`,
seeded from the Department Modules list (Classic, IT, HR, Transportation, Facilities).

## 6. Shared data foundation (built first)

Mock-data Angular services exposing `signal`s; every feature reads from these. Modeled on
the two source specs (one unified user record; per-module permission sets; module-scoped
teams). Representative volume: **~30–40 users, ~6 teams, the standard permission sets**.

### Entities & fields

**User**
- Identity: `id`, `firstName`, `middleName`, `lastName`, `email`, `phone`, `status`
  (`Active | Unverified | Inactive | Pending`), `source`
  (`Manual | SIS | Active Directory | Google | Azure`), `lastLogin`, `dateAdded`.
- Org/assignment: `roles[]` (`Agent | District Admin | School Admin | Staff | Teacher |
  Parent | Student`), `modules[]` (module ids), `teams[]` (team ids), `locations[]`,
  `topics[]`, `grade?`, `jobTitle?`.
- Custom fields: `employeeId`, `pronouns`, `emergencyContact`.
- Per-module permission: `permissionSetByModule: Record<moduleId, permissionSetId>`.
- Source-locked fields: when `source` is Azure / Active Directory / Google / SIS,
  `firstName`/`lastName`/`email`/`status` render read-only with a sync icon (Manual locks
  nothing).

**Team**
- `id`, `name`, `modules[]`, `topics[]`, `memberIds[]` (→ `memberCount`),
  `permissionSet` (id | none), `source` (`Manual | Active Directory | Azure | Google`).

**PermissionSet**
- `id`, `name`, `moduleId` (null = system-wide), `type` (`System | Custom`), `isLocked`
  (built-in sets: Global Admin, Department/Module Admin), `capabilities` (matrix state —
  see §7.4).
- System preset names from source: **System Administrator, Global User, Team Member,
  Recorder, Read Only**.

**Ticket**
- `id`, `number`, `subject`, `description`, `customerName`, `customerRole`
  (`Student | Faculty | Staff | Parent/Guardian`), `priority` (`P1 | P2 | P3`), `status`
  (`Unopened | In Progress | Waiting | Closed`), `ownerName`, `moduleId`, `receivedAt`,
  `isMyTicket`, `isMyTeam`.

### Relationships
- User → Roles (1..*); User → Modules (1..*); User → Teams (1..*);
  User → PermissionSet **per module** (1 per assigned module).
- Module → Teams (1..*); Module → PermissionSets (custom, 1..*); Module → Tickets (1..*).
- Team → Members (Users, 1..*); Team → PermissionSet (0..1).

## 7. Feature specs

### 7.1 User Management — Users tab
- **Table:** Onflo table pattern. Columns: **Name** (name + email beneath), **Roles**
  (chips w/ overflow `+N`), **Status** (badge), **Module(s)**, **Teams**, **Locations**,
  **Phone**, **Source**, **Job Title**, **Last Login**, **Date Added**. Categorical
  columns (Status, Roles, Module, Teams, Locations, Source) generate filter-panel
  checkbox lists.
- **Toolbar:** quick search, **Create User** CTA, column panel, filter panel, **Export
  CSV** (mock — `<!-- TODO eng -->`).
- **Create User** dialog (`ds-modal`): First/Middle/Last, Email, Phone, Employee ID, Job
  Title, **Modules** (multi-select; hidden + pre-filled when scoped to a module),
  Locations (multi-select), Activation Type (radio: Send Email / Activate / Do Not
  Activate). Mock validation via `.is-error` + `role="alert"`.
- **Row actions:** Edit, Delete, View Profile. **Bulk delete** for multi-selected rows
  (confirm dialog listing names/emails).
- **Module scoping:** in a module context the table shows only that module's users and the
  Module column/filter is suppressed; Global shows all.

### 7.2 User Profile — right-side drawer
- Header: avatar (initials), name, status badge, email; Edit / Save / Cancel.
- Tabs: **Details, Permissions, Tickets, Assets, Activity**.
  - **Details:** two columns — System Fields (id, names, email, phone, status, roles,
    locations, source, modules, teams, job title, topics, last login, date added) +
    Custom Fields (employee id, pronouns, emergency contact). Inline edit; synced fields
    read-only with sync icon.
  - **Permissions:** one card per assigned module → module icon/name, permission-set
    badge, teams-in-module chips, edit/remove. Non-agent users show "Non-agent users are
    not assigned module-level permissions."
  - **Tickets:** status filter (All/Open/Closed) + search + scrollable list.
  - **Assets:** search + list (name, asset id, type, assigned-on, status badge).
  - **Activity:** dated timeline (login / profile / permission / ticket / asset).
- Opening the drawer collapses the settings subnav (mirror source's
  `onSidebarCollapseChange`).

### 7.3 Teams tab
- **Table:** Team Name, **Module(s)**, **Topics**, **Member Count**, **Permission Set**,
  **Source**, row actions. Categorical filters on Module / Topics / Source.
- **Create/Edit Team** dialog: Name (required), Modules (multi; hidden when module-locked),
  Topics (multi), Permission Set (single + None), Members (searchable user picker + member
  list with remove).
- **View Members** side panel: read-only member list (avatar/name/email/status) + Edit
  button. **Delete Team** confirm dialog.

### 7.4 Permission Sets tab + editor
- **List:** permission sets (name, type System/Custom, module scope, locked indicator);
  Create CTA; row → open editor. System/locked sets open read-only.
- **Editor (full-screen):** two-column.
  - Left nav: sections **Tickets, Assets, Analytics, Campaigns, Global, Workflows,
    Integrations** with search + per-section preset color dot.
  - Right content: permission rows grouped into collapsible sub-groups; each row is a
    **toggle** or a **segmented control** (e.g. Hide / View / Manage), with Create/Edit/
    Delete sub-checkboxes when set to Manage; info/warning/auto notes.
  - **Section presets:** No Access / View Only / Full Access / Custom (bulk-apply).
  - **Data Visibility:** Tickets scope (All / Assigned Only) and Assets scope (All /
    Assigned Locations) with filter multi-selects + exclude toggles.
- Permission definitions and section content are mocked from the source's structure
  (Tickets ~40 perms, Assets ~28, etc.) at representative depth — enough to read as real,
  not necessarily every leaf.

### 7.5 Ticket Inbox
- Lives under the **Tickets** nav (subnav already built). Table list with tabs **My
  Tickets / My Team / All Tickets / Closed**, keyword search, footer count.
- Columns: select, **Subject** (+ preview), **Customer** (name + role badge), **Priority**
  (P1/P2/P3), **Status**, **Owner** (avatar + name), **Received** (time + elapsed).
- Scoped by module context (Global = all modules).

## 8. Design-mode component checklist (per feature, before writing markup)

Read `node_modules/@onflo/design-system/.claude/examples/{component}.html` first for:
`select` (multi + search), `input`, `checkbox`, `radio`, `toggle`, `dialog`/`modal`,
`tabs` / `inner-page-tabs`, `label`, `tag`, `chip`, `avatar`, `menu`, `table-starter.html`.
Table pages: add `table-init.js` + `table-sim.css` per the guide's table pattern.

## 9. Build strategy

### Phase 0 — Foundation (single agent, blocks everything)
- Mock-data models + services (`User`, `Team`, `PermissionSet`, `Module`, `Ticket`).
- `ModuleContextService`; module switcher in the shell; role-gating in `app.ts`/`app.html`.
- `settings/user-management` route + tabbed page scaffold; wire the subnav item.

### Phase 1 — Features (parallel agents, isolated component folders)
One agent each, all reading the Phase 0 services:
- Users tab (table + create/edit/delete + filters + bulk + export-mock)
- User Profile drawer
- Teams tab
- Permission Sets tab + editor
- Ticket Inbox

### Phase 2 — Integration + review
- Wire cross-feature actions (open Profile from Users; open Permission editor from
  Permissions tab / set list; module-scope reactivity end-to-end).
- `ng build` clean; design-mode lint (no forbidden imports/hardcoded values); code review.

Worktrees used if parallel agents would otherwise contend on shared files.

## 10. Out of scope
- The source's standalone **Departments** page/feature (replaced by Department Modules).
- Real persistence, API, auth, reactive-form validation, AG Grid, live charts (mock +
  `<!-- TODO eng -->`).
- Assets and Analytics page bodies (stubs stay; only their nav gating is touched).
- Switching this project to engineering mode (forbidden).

## 11. Risks / watch-items
- **Module switcher is new chrome** in an already-built top-nav — must use
  `ds-top-nav__actions`, tokens, and a `ds-menu`; verify it doesn't break the existing
  action-button row or theme toggle.
- **Table pattern** requires `table-init.js` + `table-sim.css` in `angular.json` and the
  `ngAfterViewInit` + `cdr.detach()` wiring; three tables (Users, Teams, Tickets) share
  this setup.
- **Faithful permission matrix** is the deepest single piece — mock at representative
  depth, not exhaustive, to stay in budget.
- Keep all five features reading **one** set of services so module scoping stays
  consistent; avoid per-feature data copies.
