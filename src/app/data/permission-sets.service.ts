import { Injectable, signal } from '@angular/core';
import { PermissionSet } from './models';

@Injectable({ providedIn: 'root' })
export class PermissionSetsService {
  readonly sets = signal<PermissionSet[]>([
    // ── System sets (5) — the first two are locked ──────────────────────────
    {
      id: 'ps-sysadmin',
      name: 'System Administrator',
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
