import { Injectable, signal } from '@angular/core';
import { Team } from './models';

@Injectable({ providedIn: 'root' })
export class TeamsService {
  // A team belongs to EXACTLY ONE module (`module`), or is district-wide when `module` is null
  // (a "global" team — authored in the Global context; see the global teams at the end). Manual
  // teams are authored here (one department, or global). Integration-synced teams are created in
  // the integration, which selects the module(s) they apply to — picking more than one yields the SAME team name once PER module
  // (same members, separate record). So "District Service Desk" (Google) and "Support" (Azure)
  // each appear twice below, one row per module.
  // Every id in `memberIds` matches a UsersService user (and each of those users lists the
  // team in their own `teams` array), `module` matches a ModulesService module, and
  // `permissionSetId` (when present) matches a PermissionSetsService set.
  readonly teams = signal<Team[]>([
    {
      id: 't1', name: 'IT Help Desk', module: 'it',
      memberIds: ['u1', 'u2', 'u3', 'u4', 'u26', 'u29'], permissionSetId: 'ps-it-desk-lead', source: 'Active Directory',
      updatedAt: '2026-06-10T14:30:00Z',
    },
    {
      id: 't2', name: 'Classic Triage', module: 'classic',
      memberIds: ['u1', 'u8', 'u11', 'u12', 'u25'], permissionSetId: 'ps-classic-triage', source: 'Manual',
      updatedAt: '2026-05-22T11:15:00Z',
    },
    {
      id: 't3', name: 'Transportation Dispatch', module: 'transportation',
      memberIds: ['u8', 'u9', 'u10', 'u22'], permissionSetId: 'ps-team-member', source: 'Manual',
      updatedAt: '2026-06-18T09:40:00Z',
    },
    {
      id: 't4', name: 'HR Casework', module: 'hr',
      memberIds: ['u5', 'u6', 'u7', 'u21', 'u29'], permissionSetId: 'ps-team-member', source: 'Azure',
      updatedAt: '2026-04-30T16:20:00Z',
    },
    {
      id: 't5', name: 'Facilities Maintenance', module: 'facilities',
      memberIds: ['u13', 'u14', 'u15', 'u23', 'u27'], source: 'Manual',
      updatedAt: '2026-06-02T10:05:00Z',
    },
    // Synced from Google to two modules → one team per module (same name + members + sync time).
    {
      id: 't6', name: 'District Service Desk', module: 'classic',
      memberIds: ['u1', 'u5', 'u20', 'u23', 'u26', 'u29'], permissionSetId: 'ps-global-user', source: 'Google',
      updatedAt: '2026-06-15T08:00:00Z',
    },
    {
      id: 't6b', name: 'District Service Desk', module: 'it',
      memberIds: ['u1', 'u5', 'u20', 'u23', 'u26', 'u29'], permissionSetId: 'ps-global-user', source: 'Google',
      updatedAt: '2026-06-15T08:00:00Z',
    },
    // Synced from Azure to Classic + IT → same team name + members + sync time, one record per module.
    {
      id: 't7', name: 'Support', module: 'classic',
      memberIds: ['u1', 'u20', 'u26', 'u29'], permissionSetId: 'ps-team-member', source: 'Azure',
      updatedAt: '2026-05-28T13:45:00Z',
    },
    {
      id: 't7b', name: 'Support', module: 'it',
      memberIds: ['u1', 'u20', 'u26', 'u29'], permissionSetId: 'ps-team-member', source: 'Azure',
      updatedAt: '2026-05-28T13:45:00Z',
    },
    // ── Global teams (module: null) — district-wide, not tied to one department. A global admin
    // manages these in the Global context; department admins never see them. ───────────────────
    {
      id: 't-global-1', name: 'District Leadership', module: null,
      memberIds: ['u1', 'u5', 'u8', 'u20'], permissionSetId: 'ps-global-user', source: 'Manual',
      updatedAt: '2026-06-20T15:30:00Z',
    },
    {
      id: 't-global-2', name: 'Emergency Response Team', module: null,
      memberIds: ['u9', 'u13', 'u22', 'u26', 'u29'], permissionSetId: 'ps-team-member', source: 'Manual',
      updatedAt: '2026-03-12T12:00:00Z',
    },
  ]);

  add(t: Omit<Team, 'id'>): void {
    const id = `t-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
    this.teams.update(list => [...list, { ...t, id }]);
  }

  update(id: string, patch: Partial<Team>): void {
    this.teams.update(list => list.map(t => (t.id === id ? { ...t, ...patch, id: t.id } : t)));
  }

  remove(ids: string[]): void {
    const drop = new Set(ids);
    this.teams.update(list => list.filter(t => !drop.has(t.id)));
  }

  /** All teams when moduleId is null; otherwise teams in that module. */
  byModule(moduleId: string | null): Team[] {
    if (moduleId === null) return this.teams();
    return this.teams().filter(t => t.module === moduleId);
  }
}
