import { Injectable, signal } from '@angular/core';
import { PermissionSet } from './models';

// The catalog types + full ported permission model live in permission-catalog.ts.
import { PermissionSection, ACTIONS_SECTIONS, SETTINGS_SECTIONS } from './permission-catalog';

@Injectable({ providedIn: 'root' })
export class PermissionSetsService {
  readonly sets = signal<PermissionSet[]>([
    // ── System sets (6) — the first three are locked ────────────────────────
    // Global Admin is the global-tier set: isGlobalOnly means it shows ONLY in the Global
    // switcher context and is hidden from every department. (id stays 'ps-sysadmin' — users
    // reference it via permissionSetByModule, so renaming the id would break those links.)
    {
      id: 'ps-sysadmin',
      name: 'Global Admin',
      moduleId: null,
      type: 'System',
      isLocked: true,
      isGlobalOnly: true,
      capabilities: {
        manageUsers: true,
        manageTeams: true,
        managePermissionSets: true,
        manageSettings: true,
        viewAnalytics: true,
        ticketAccess: 'All',
      },
      updatedAt: '2026-01-15T10:00:00Z',
    },
    // Department Admin — the department-tier admin set. System-wide (moduleId: null) so it
    // shows in every department context, but never in Global (only Global Admin shows there).
    {
      id: 'ps-dept-admin',
      name: 'Department Admin',
      moduleId: null,
      type: 'System',
      isLocked: true,
      capabilities: {
        manageUsers: true,
        manageTeams: true,
        managePermissionSets: true,
        manageSettings: true,
        viewAnalytics: true,
        ticketAccess: 'All',
      },
      updatedAt: '2026-02-03T09:30:00Z',
    },
    {
      id: 'ps-global-user',
      name: 'Global User',
      moduleId: null,
      type: 'System',
      isLocked: true,
      capabilities: {
        manageUsers: true,
        manageTeams: true,
        managePermissionSets: false,
        manageSettings: false,
        viewAnalytics: true,
        ticketAccess: 'All',
      },
      updatedAt: '2026-01-20T14:00:00Z',
    },
    {
      id: 'ps-team-member',
      name: 'Team Member',
      moduleId: null,
      type: 'System',
      isLocked: false,
      capabilities: {
        manageUsers: false,
        manageTeams: false,
        managePermissionSets: false,
        manageSettings: false,
        viewAnalytics: false,
        ticketAccess: 'Team',
      },
      updatedAt: '2026-05-12T11:20:00Z',
    },
    {
      id: 'ps-recorder',
      name: 'Recorder',
      moduleId: null,
      type: 'System',
      isLocked: false,
      capabilities: {
        manageUsers: false,
        manageTeams: false,
        managePermissionSets: false,
        manageSettings: false,
        viewAnalytics: false,
        ticketAccess: 'Own',
      },
      updatedAt: '2026-04-08T16:45:00Z',
    },
    {
      id: 'ps-readonly',
      name: 'Read Only',
      moduleId: null,
      type: 'System',
      isLocked: false,
      capabilities: {
        manageUsers: false,
        manageTeams: false,
        managePermissionSets: false,
        manageSettings: false,
        viewAnalytics: true,
        ticketAccess: 'Read',
      },
      updatedAt: '2026-03-22T13:10:00Z',
    },
    // ── Custom sets (2) — each scoped to a module ───────────────────────────
    {
      id: 'ps-it-desk-lead',
      name: 'IT Desk Lead',
      moduleId: 'it',
      type: 'Custom',
      isLocked: false,
      capabilities: {
        manageUsers: false,
        manageTeams: true,
        managePermissionSets: false,
        manageSettings: true,
        viewAnalytics: true,
        ticketAccess: 'All',
      },
      updatedAt: '2026-06-11T15:30:00Z',
    },
    {
      id: 'ps-classic-triage',
      name: 'Classic Triage',
      moduleId: 'classic',
      type: 'Custom',
      isLocked: false,
      capabilities: {
        manageUsers: false,
        manageTeams: false,
        managePermissionSets: false,
        manageSettings: false,
        viewAnalytics: true,
        ticketAccess: 'Team',
      },
      updatedAt: '2026-06-05T10:15:00Z',
    },
  ]);

  // Two catalogs feed the editor's Actions and Settings tabs. Tickets & Assets appear in BOTH
  // (action toggles vs admin segments), so they're separate arrays — see permission-catalog.ts.
  readonly actionsSections: PermissionSection[] = ACTIONS_SECTIONS;
  readonly settingsSections: PermissionSection[] = SETTINGS_SECTIONS;

  add(s: Omit<PermissionSet, 'id' | 'updatedAt'>): void {
    const id = `ps-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
    this.sets.update(list => [...list, { ...s, id, updatedAt: new Date().toISOString() }]);
  }

  // Any edit (re-stamps `updatedAt`, which backs the table's Last Updated column).
  update(id: string, patch: Partial<PermissionSet>): void {
    const updatedAt = new Date().toISOString();
    this.sets.update(list => list.map(s => (s.id === id ? { ...s, ...patch, id: s.id, updatedAt } : s)));
  }

  remove(ids: string[]): void {
    const drop = new Set(ids);
    this.sets.update(list => list.filter(s => !drop.has(s.id)));
  }
}
