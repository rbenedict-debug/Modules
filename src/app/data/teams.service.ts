import { Injectable, signal } from '@angular/core';
import { Team } from './models';

@Injectable({ providedIn: 'root' })
export class TeamsService {
  // ~6 teams across the five modules. Every id in `memberIds` matches a UsersService user
  // (and each of those users lists the team in their own `teams` array), every id in
  // `modules` matches a ModulesService module, and `permissionSetId` (when present)
  // matches a PermissionSetsService set.
  readonly teams = signal<Team[]>([
    {
      id: 't1', name: 'IT Help Desk', modules: ['it'], topics: ['Hardware', 'Software', 'Network', 'Access'],
      memberIds: ['u1', 'u2', 'u3', 'u4', 'u26', 'u29'], permissionSetId: 'ps-it-desk-lead', source: 'Active Directory',
    },
    {
      id: 't2', name: 'Classic Triage', modules: ['classic'], topics: ['General', 'Technology', 'Facilities'],
      memberIds: ['u1', 'u8', 'u11', 'u12', 'u25'], permissionSetId: 'ps-classic-triage', source: 'Manual',
    },
    {
      id: 't3', name: 'Transportation Dispatch', modules: ['transportation'], topics: ['Routes', 'Safety', 'Maintenance'],
      memberIds: ['u8', 'u9', 'u10', 'u22'], permissionSetId: 'ps-team-member', source: 'Manual',
    },
    {
      id: 't4', name: 'HR Casework', modules: ['hr'], topics: ['Benefits', 'Payroll', 'Policy'],
      memberIds: ['u5', 'u6', 'u7', 'u21', 'u29'], permissionSetId: 'ps-team-member', source: 'Azure',
    },
    {
      id: 't5', name: 'Facilities Maintenance', modules: ['facilities'], topics: ['Maintenance', 'HVAC', 'Grounds'],
      memberIds: ['u13', 'u14', 'u15', 'u23', 'u27'], source: 'Manual',
    },
    {
      id: 't6', name: 'District Service Desk', modules: ['classic', 'it'], topics: ['General', 'Access'],
      memberIds: ['u1', 'u5', 'u20', 'u23', 'u26', 'u29'], permissionSetId: 'ps-global-user', source: 'Google',
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

  /** All teams when moduleId is null; otherwise teams whose `modules` include it. */
  byModule(moduleId: string | null): Team[] {
    if (moduleId === null) return this.teams();
    return this.teams().filter(t => t.modules.includes(moduleId));
  }
}
