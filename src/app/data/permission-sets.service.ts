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
    },
  ]);

  // Two catalogs feed the editor's Actions and Settings tabs. Tickets & Assets appear in BOTH
  // (action toggles vs admin segments), so they're separate arrays — see permission-catalog.ts.
  readonly actionsSections: PermissionSection[] = ACTIONS_SECTIONS;
  readonly settingsSections: PermissionSection[] = SETTINGS_SECTIONS;

  add(s: Omit<PermissionSet, 'id'>): void {
    const id = `ps-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
    this.sets.update(list => [...list, { ...s, id }]);
  }

  update(id: string, patch: Partial<PermissionSet>): void {
    this.sets.update(list => list.map(s => (s.id === id ? { ...s, ...patch, id: s.id } : s)));
  }

  remove(ids: string[]): void {
    const drop = new Set(ids);
    this.sets.update(list => list.filter(s => !drop.has(s.id)));
  }
}
