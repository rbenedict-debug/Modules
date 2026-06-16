# ⌘K / Ctrl+K Persona Swapper — Design Spec

**Date:** 2026-06-16 · **Status:** Approved · **Project:** Modules (Angular + Onflo, design mode)

## Goal
Port the source prototype's ⌘K preview-switcher as a **persona swapper**: a cross-platform command palette (⌘K on Mac, Ctrl+K on Windows) that re-renders the whole app *as a chosen user persona would actually experience it*.

## Concept
**Persona is the source of truth.** The top-nav module switcher (built in the port) is subordinate to it — it only appears when the active persona has more than one context to move between. Examples:
- **Global Admin** → module switcher shows Global + all modules; full nav (Settings/Analytics/User Management).
- **IT Agent** → one module, agent role → switcher **hidden**, Settings/Analytics **hidden**; just the IT agent view.

## Persona model
`Persona { id, name, title, isGlobalAdmin, moduleAccess: { moduleId, role: 'Admin'|'Agent' }[] }`. A `PersonaService` holds the persona list + the current persona (signal) + `select(id)`.

## What the persona drives (via a refactored `ModuleContextService`, persona-derived)
- `availableModules` — the persona's modules, each enriched with the persona's role.
- `showSwitcher` = `isGlobalAdmin || availableModules.length > 1` (top-nav switcher visibility).
- `isGlobal` / `currentModule` / `isAgentRole` / `canManageUsers` / `canCreateUsers` / `canAdminActions` — all derived from the active persona + current context.
- On persona change, the active context resets: Global for global admins, else the persona's first module.
- The existing public API (`currentModuleId`, `isGlobal`, `isAgentRole`, `byModule` consumers, `select`) is preserved so the five features keep working unchanged.
- `Module.role` is **removed** (role now comes from the persona, not a global default).

## The palette (`app-command-palette`, always mounted in the shell)
- Opens on **⌘K (Mac) / Ctrl+K (Windows)** — `e.key === 'k' && (e.metaKey || e.ctrlKey)`. Esc/scrim closes; ↑↓ moves highlight; Enter selects; type to filter (name/title/access).
- Centered overlay (DS class API, tokens, `--shadow-elevation-3`, above the profile drawer). Each row: avatar initials, name, title + access summary, a "Viewing" tag on the current persona.
- Picking a persona → `PersonaService.select(id)` → shell re-renders. Persona-only (no nav/theme commands — true to the source).

## Demo persona set (names align with the seeded user directory)
- **Scarlett Bailey — Deputy Superintendent** — Global Admin (Global + all 5 modules).
- **Marcus Lee — Transportation Manager** — Admin in Transportation + Classic (switcher with 2, no Global).
- **Linda Okafor — HR Director** — Admin in HR only (no switcher, but Settings/Analytics for HR).
- **James Carter — Help Desk Technician** — Agent in IT only (no switcher, no Settings/Analytics).
- **Hannah Cohen — Facilities Manager** — Agent in Facilities only.
Default persona: Scarlett (Global Admin), so the app opens in the full view.

## Shell wiring
- Gate the switcher: `@if (moduleCtx.showSwitcher()) { <app-module-switcher /> }`.
- Mount `<app-command-palette />` in `ds-page-layout`.
- Top-nav avatar shows the current persona's initials (reinforces "who am I viewing as").
- The existing agent-role redirect effect already bounces off Settings/Analytics when `isAgentRole` flips — now also fires on persona swap.

## Design-mode / out of scope
CSS class API + tokens only; no eng deps. No navigation/theme commands in the palette (persona-only). No persistence (in-memory signal).
