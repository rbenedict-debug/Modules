import { Injectable, signal } from '@angular/core';
import { User } from './models';

@Injectable({ providedIn: 'root' })
export class UsersService {
  // Mock directory of ~32 users spread across all five modules. Cross-references are
  // internally consistent: every id in `teams` matches a TeamsService team, every id in
  // `modules` matches a ModulesService module, and every value in `permissionSetByModule`
  // matches a PermissionSetsService set (keyed by a module the user belongs to).
  // Dates are static ISO strings — never computed from `new Date()`.
  readonly users = signal<User[]>([
    {
      id: 'u1', firstName: 'Maria', lastName: 'Hernandez', email: 'maria.hernandez@district.edu',
      phone: '555-0101', status: 'Active', source: 'Manual', roles: ['District Admin', 'Agent'],
      modules: ['classic', 'it'], teams: ['t2', 't1', 't6', 't6b', 't7', 't7b'], locations: ['District Office'],
      jobTitle: 'IT Director', employeeId: 'E1001', pronouns: 'she/her',
      customFields: { room: 'B-100', shift: 'Morning', badge: 'BADGE-1001' },
      permissionSetByModule: { classic: 'ps-sysadmin', it: 'ps-it-desk-lead' },
      lastLogin: '2026-06-15T08:12:00Z', dateAdded: '2023-01-10T09:00:00Z',
    },
    {
      id: 'u2', firstName: 'James', middleName: 'R', lastName: 'Carter', email: 'james.carter@district.edu',
      phone: '555-0102', status: 'Active', source: 'Active Directory', roles: ['Agent'],
      modules: ['it'], teams: ['t1'], locations: ['District Office'],
      jobTitle: 'Help Desk Technician', employeeId: 'E1002',
      customFields: { room: 'B-214', shift: 'Afternoon', badge: 'BADGE-1002' },
      permissionSetByModule: { it: 'ps-team-member' },
      lastLogin: '2026-06-14T16:45:00Z', dateAdded: '2023-03-02T09:00:00Z',
    },
    {
      id: 'u3', firstName: 'Aisha', lastName: 'Khan', email: 'aisha.khan@district.edu',
      phone: '555-0103', status: 'Active', source: 'Active Directory', roles: ['Agent'],
      modules: ['it'], teams: ['t1'], locations: ['Lincoln High'],
      jobTitle: 'Systems Analyst', employeeId: 'E1003', pronouns: 'she/her',
      customFields: { room: 'A-118', shift: 'Morning' },
      permissionSetByModule: { it: 'ps-team-member' },
      lastLogin: '2026-06-15T10:30:00Z', dateAdded: '2023-05-18T09:00:00Z',
    },
    {
      id: 'u4', firstName: 'Robert', lastName: 'Nguyen', email: 'robert.nguyen@district.edu',
      phone: '555-0104', status: 'Inactive', source: 'Active Directory', roles: ['Agent'],
      modules: ['it'], teams: ['t1'], locations: ['Lincoln High'],
      jobTitle: 'Desktop Support', employeeId: 'E1004',
      permissionSetByModule: { it: 'ps-readonly' },
      lastLogin: '2025-11-20T13:00:00Z', dateAdded: '2022-09-12T09:00:00Z',
    },
    {
      id: 'u5', firstName: 'Linda', lastName: 'Okafor', email: 'linda.okafor@district.edu',
      phone: '555-0105', status: 'Active', source: 'Manual', roles: ['District Admin'],
      modules: ['classic', 'hr'], teams: ['t6', 't6b', 't4'], locations: ['District Office'],
      jobTitle: 'HR Director', employeeId: 'E1005', pronouns: 'she/her',
      permissionSetByModule: { classic: 'ps-global-user', hr: 'ps-sysadmin' },
      lastLogin: '2026-06-15T07:50:00Z', dateAdded: '2022-02-01T09:00:00Z',
    },
    {
      id: 'u6', firstName: 'David', lastName: 'Thompson', email: 'david.thompson@district.edu',
      phone: '555-0106', status: 'Active', source: 'Manual', roles: ['Agent'],
      modules: ['hr'], teams: ['t4'], locations: ['District Office'],
      jobTitle: 'HR Specialist', employeeId: 'E1006',
      permissionSetByModule: { hr: 'ps-team-member' },
      lastLogin: '2026-06-13T11:20:00Z', dateAdded: '2023-07-22T09:00:00Z',
    },
    {
      id: 'u7', firstName: 'Sofia', lastName: 'Rossi', email: 'sofia.rossi@district.edu',
      phone: '555-0107', status: 'Pending', source: 'Manual', roles: ['Agent'],
      modules: ['hr'], teams: ['t4'], locations: ['Roosevelt Middle'],
      jobTitle: 'HR Coordinator', employeeId: 'E1007', pronouns: 'she/her',
      permissionSetByModule: { hr: 'ps-recorder' },
      dateAdded: '2026-05-30T09:00:00Z',
    },
    {
      id: 'u8', firstName: 'Marcus', lastName: 'Lee', email: 'marcus.lee@district.edu',
      phone: '555-0108', status: 'Active', source: 'SIS', roles: ['District Admin', 'Agent'],
      modules: ['transportation', 'classic'], teams: ['t3', 't2'], locations: ['Transport Depot'],
      jobTitle: 'Transportation Manager', employeeId: 'E1008',
      customFields: { room: 'Depot Office', shift: 'Morning', badge: 'BADGE-1008' },
      permissionSetByModule: { transportation: 'ps-sysadmin', classic: 'ps-classic-triage' },
      lastLogin: '2026-06-15T06:30:00Z', dateAdded: '2022-08-15T09:00:00Z',
    },
    {
      id: 'u9', firstName: 'Emily', lastName: 'Davis', email: 'emily.davis@district.edu',
      phone: '555-0109', status: 'Active', source: 'SIS', roles: ['Agent'],
      modules: ['transportation'], teams: ['t3'], locations: ['Transport Depot'],
      jobTitle: 'Dispatcher', employeeId: 'E1009', pronouns: 'she/her',
      customFields: { shift: 'Evening', badge: 'BADGE-1009' },
      permissionSetByModule: { transportation: 'ps-team-member' },
      lastLogin: '2026-06-14T09:15:00Z', dateAdded: '2023-04-10T09:00:00Z',
    },
    {
      id: 'u10', firstName: 'Carlos', lastName: 'Mendoza', email: 'carlos.mendoza@district.edu',
      phone: '555-0110', status: 'Active', source: 'SIS', roles: ['Agent'],
      modules: ['transportation'], teams: ['t3'], locations: ['Transport Depot'],
      jobTitle: 'Fleet Coordinator', employeeId: 'E1010',
      permissionSetByModule: { transportation: 'ps-team-member' },
      lastLogin: '2026-06-12T14:00:00Z', dateAdded: '2023-02-28T09:00:00Z',
    },
    {
      id: 'u11', firstName: 'Grace', lastName: 'Park', email: 'grace.park@district.edu',
      phone: '555-0111', status: 'Active', source: 'Manual', roles: ['School Admin'],
      modules: ['classic'], teams: ['t2'], locations: ['Lincoln High'],
      jobTitle: 'Principal', employeeId: 'E1011', pronouns: 'she/her',
      permissionSetByModule: { classic: 'ps-classic-triage' },
      lastLogin: '2026-06-15T08:00:00Z', dateAdded: '2022-06-05T09:00:00Z',
    },
    {
      id: 'u12', firstName: 'Daniel', lastName: 'Wright', email: 'daniel.wright@district.edu',
      phone: '555-0112', status: 'Active', source: 'Manual', roles: ['School Admin'],
      modules: ['classic'], teams: ['t2'], locations: ['Roosevelt Middle'],
      jobTitle: 'Assistant Principal', employeeId: 'E1012',
      permissionSetByModule: { classic: 'ps-team-member' },
      lastLogin: '2026-06-11T15:30:00Z', dateAdded: '2023-08-19T09:00:00Z',
    },
    {
      id: 'u13', firstName: 'Hannah', lastName: 'Cohen', email: 'hannah.cohen@district.edu',
      phone: '555-0113', status: 'Active', source: 'Manual', roles: ['Agent'],
      modules: ['facilities'], teams: ['t5'], locations: ['District Office'],
      jobTitle: 'Facilities Manager', employeeId: 'E1013', pronouns: 'she/her',
      customFields: { room: 'M-05', badge: 'BADGE-1013' },
      permissionSetByModule: { facilities: 'ps-team-member' },
      lastLogin: '2026-06-14T07:45:00Z', dateAdded: '2022-11-30T09:00:00Z',
    },
    {
      id: 'u14', firstName: 'Samuel', lastName: 'Brooks', email: 'samuel.brooks@district.edu',
      phone: '555-0114', status: 'Inactive', source: 'Manual', roles: ['Agent'],
      modules: ['facilities'], teams: ['t5'], locations: ['Lincoln High'],
      jobTitle: 'Maintenance Tech', employeeId: 'E1014',
      permissionSetByModule: { facilities: 'ps-readonly' },
      lastLogin: '2025-10-02T12:00:00Z', dateAdded: '2021-12-01T09:00:00Z',
    },
    {
      id: 'u15', firstName: 'Olivia', lastName: 'Martin', email: 'olivia.martin@district.edu',
      phone: '555-0115', status: 'Active', source: 'Manual', roles: ['Agent'],
      modules: ['facilities'], teams: ['t5'], locations: ['Roosevelt Middle'],
      jobTitle: 'Grounds Lead', employeeId: 'E1015', pronouns: 'she/her',
      permissionSetByModule: { facilities: 'ps-team-member' },
      lastLogin: '2026-06-13T08:30:00Z', dateAdded: '2023-09-25T09:00:00Z',
    },
    {
      id: 'u16', firstName: 'Ethan', lastName: 'Clark', email: 'ethan.clark@district.edu',
      phone: '555-0116', status: 'Pending', source: 'Manual', roles: ['Staff'],
      modules: ['classic'], teams: [], locations: ['Lincoln High'],
      jobTitle: 'Office Assistant', employeeId: 'E1016',
      permissionSetByModule: { classic: 'ps-recorder' },
      dateAdded: '2026-06-10T09:00:00Z',
    },
    {
      id: 'u17', firstName: 'Ava', lastName: 'Patel', email: 'ava.patel@district.edu',
      phone: '555-0117', status: 'Active', source: 'Google', roles: ['Teacher'],
      modules: ['classic'], teams: [], locations: ['Lincoln High'],
      jobTitle: 'Math Teacher', employeeId: 'E1017', pronouns: 'she/her',
      permissionSetByModule: { classic: 'ps-readonly' },
      lastLogin: '2026-06-12T13:10:00Z', dateAdded: '2023-08-20T09:00:00Z',
    },
    {
      id: 'u18', firstName: 'Noah', lastName: 'Walker', email: 'noah.walker@district.edu',
      phone: '555-0118', status: 'Active', source: 'Google', roles: ['Teacher'],
      modules: ['classic'], teams: [], locations: ['Roosevelt Middle'],
      jobTitle: 'Science Teacher', employeeId: 'E1018',
      permissionSetByModule: { classic: 'ps-readonly' },
      lastLogin: '2026-06-09T10:00:00Z', dateAdded: '2022-08-22T09:00:00Z',
    },
    {
      id: 'u19', firstName: 'Isabella', lastName: 'Reyes', email: 'isabella.reyes@district.edu',
      phone: '555-0119', status: 'Pending', source: 'Google', roles: ['Teacher'],
      modules: ['classic'], teams: [], locations: ['Lincoln High'],
      jobTitle: 'English Teacher', employeeId: 'E1019', pronouns: 'she/her',
      permissionSetByModule: { classic: 'ps-readonly' },
      dateAdded: '2026-06-01T09:00:00Z',
    },
    {
      id: 'u20', firstName: 'Liam', lastName: 'Foster', email: 'liam.foster@district.edu',
      phone: '555-0120', status: 'Active', source: 'Azure', roles: ['Staff'],
      modules: ['it', 'classic'], teams: ['t6', 't6b', 't7', 't7b'], locations: ['District Office'],
      jobTitle: 'Onboarding Specialist', employeeId: 'E1020',
      customFields: { room: 'C-110', shift: 'Afternoon', badge: 'BADGE-1020' },
      permissionSetByModule: { it: 'ps-readonly', classic: 'ps-team-member' },
      lastLogin: '2026-06-14T11:00:00Z', dateAdded: '2023-10-15T09:00:00Z',
    },
    {
      id: 'u21', firstName: 'Mia', lastName: 'Sanders', email: 'mia.sanders@district.edu',
      phone: '555-0121', status: 'Active', source: 'Azure', roles: ['Staff'],
      modules: ['hr'], teams: ['t4'], locations: ['District Office'],
      jobTitle: 'Benefits Administrator', employeeId: 'E1021', pronouns: 'she/her',
      permissionSetByModule: { hr: 'ps-team-member' },
      lastLogin: '2026-06-15T09:40:00Z', dateAdded: '2023-06-12T09:00:00Z',
    },
    {
      id: 'u22', firstName: 'Lucas', lastName: 'Gray', email: 'lucas.gray@district.edu',
      phone: '555-0122', status: 'Active', source: 'SIS', roles: ['Agent'],
      modules: ['transportation'], teams: ['t3'], locations: ['Transport Depot'],
      jobTitle: 'Route Planner', employeeId: 'E1022',
      permissionSetByModule: { transportation: 'ps-recorder' },
      lastLogin: '2026-06-10T07:00:00Z', dateAdded: '2024-01-08T09:00:00Z',
    },
    {
      id: 'u23', firstName: 'Charlotte', lastName: 'Bennett', email: 'charlotte.bennett@district.edu',
      phone: '555-0123', status: 'Active', source: 'Manual', roles: ['District Admin'],
      modules: ['classic', 'facilities'], teams: ['t6', 't6b', 't5'], locations: ['District Office'],
      jobTitle: 'Operations Director', employeeId: 'E1023', pronouns: 'she/her',
      permissionSetByModule: { classic: 'ps-global-user', facilities: 'ps-sysadmin' },
      lastLogin: '2026-06-15T08:25:00Z', dateAdded: '2021-09-01T09:00:00Z',
    },
    {
      id: 'u24', firstName: 'Benjamin', lastName: 'Hughes', email: 'benjamin.hughes@district.edu',
      phone: '555-0124', status: 'Inactive', source: 'Manual', roles: ['Staff'],
      modules: ['it'], teams: [], locations: ['Lincoln High'],
      jobTitle: 'AV Technician', employeeId: 'E1024',
      permissionSetByModule: { it: 'ps-readonly' },
      lastLogin: '2025-09-15T10:00:00Z', dateAdded: '2022-04-19T09:00:00Z',
    },
    {
      id: 'u25', firstName: 'Amelia', lastName: 'Ward', email: 'amelia.ward@district.edu',
      phone: '555-0125', status: 'Active', source: 'Manual', roles: ['Agent'],
      modules: ['classic'], teams: ['t2'], locations: ['Roosevelt Middle'],
      jobTitle: 'Service Desk Agent', employeeId: 'E1025', pronouns: 'she/her',
      permissionSetByModule: { classic: 'ps-team-member' },
      lastLogin: '2026-06-14T12:30:00Z', dateAdded: '2023-11-06T09:00:00Z',
    },
    {
      id: 'u26', firstName: 'Henry', lastName: 'Coleman', email: 'henry.coleman@district.edu',
      phone: '555-0126', status: 'Active', source: 'Active Directory', roles: ['Agent'],
      modules: ['it'], teams: ['t1', 't6', 't6b', 't7', 't7b'], locations: ['District Office'],
      jobTitle: 'Network Engineer', employeeId: 'E1026',
      customFields: { room: 'B-220', shift: 'Overnight', badge: 'BADGE-1026' },
      permissionSetByModule: { it: 'ps-it-desk-lead' },
      lastLogin: '2026-06-15T09:00:00Z', dateAdded: '2022-05-23T09:00:00Z',
    },
    {
      id: 'u27', firstName: 'Ella', lastName: 'Rivera', email: 'ella.rivera@district.edu',
      phone: '555-0127', status: 'Active', source: 'Manual', roles: ['Staff'],
      modules: ['facilities'], teams: ['t5'], locations: ['Lincoln High'],
      jobTitle: 'Custodial Supervisor', employeeId: 'E1027', pronouns: 'she/her',
      permissionSetByModule: { facilities: 'ps-recorder' },
      lastLogin: '2026-06-13T06:30:00Z', dateAdded: '2023-03-14T09:00:00Z',
    },
    {
      id: 'u28', firstName: 'Jack', lastName: 'Murphy', email: 'jack.murphy@district.edu',
      phone: '555-0128', status: 'Pending', source: 'SIS', roles: ['Agent'],
      modules: ['transportation'], teams: [], locations: ['Transport Depot'],
      jobTitle: 'Trainee Dispatcher', employeeId: 'E1028',
      permissionSetByModule: { transportation: 'ps-recorder' },
      dateAdded: '2026-06-08T09:00:00Z',
    },
    {
      id: 'u29', firstName: 'Scarlett', lastName: 'Bailey', email: 'scarlett.bailey@district.edu',
      phone: '555-0129', status: 'Active', source: 'Manual', roles: ['District Admin', 'Agent'],
      modules: ['classic', 'it', 'hr'], teams: ['t6', 't6b', 't1', 't4', 't7', 't7b'], locations: ['District Office'],
      jobTitle: 'Deputy Superintendent', employeeId: 'E1029', pronouns: 'she/her',
      permissionSetByModule: { classic: 'ps-sysadmin', it: 'ps-readonly', hr: 'ps-global-user' },
      lastLogin: '2026-06-15T07:15:00Z', dateAdded: '2020-07-01T09:00:00Z',
    },
    {
      id: 'u30', firstName: 'Mason', lastName: 'Cooper', email: 'mason.cooper@district.edu',
      phone: '555-0130', status: 'Active', source: 'Manual', roles: ['Parent'],
      modules: ['classic'], teams: [], locations: ['Lincoln High'],
      permissionSetByModule: { classic: 'ps-readonly' },
      lastLogin: '2026-06-05T18:00:00Z', dateAdded: '2024-08-30T09:00:00Z',
    },
    {
      id: 'u31', firstName: 'Chloe', lastName: 'Morgan', email: 'chloe.morgan@students.district.edu',
      status: 'Active', source: 'SIS', roles: ['Student'],
      modules: ['classic'], teams: [], locations: ['Lincoln High'],
      grade: 11, permissionSetByModule: { classic: 'ps-readonly' },
      lastLogin: '2026-06-12T14:45:00Z', dateAdded: '2024-08-25T09:00:00Z',
    },
    {
      id: 'u32', firstName: 'Logan', lastName: 'Price', email: 'logan.price@students.district.edu',
      status: 'Pending', source: 'SIS', roles: ['Student'],
      modules: ['classic'], teams: [], locations: ['Roosevelt Middle'],
      grade: 8, permissionSetByModule: { classic: 'ps-readonly' },
      dateAdded: '2026-06-02T09:00:00Z',
    },
  ]);

  /** The normalized default directory (the Active-only-holds-permissions rule already applied),
   *  captured at startup so ScenarioService can restore it when leaving a demo scenario. */
  private defaultUsers: User[] = [];

  constructor() {
    // Demo lifecycle rule: only Active agents hold permissions. A Pending agent hasn't been
    // provisioned yet, and an Inactive agent has had access revoked — so neither has a
    // permission set assigned. Clear it at seed time so every surface that reads it stays
    // consistent from one source: the agent profile's Permissions tab (empty state), the
    // agents-table Permission Sets column, the permission-set member counts, and the set
    // editor's assigned-members list. (Activity is independent and handled in the profile's
    // Activity tab: Inactive agents keep their history, Pending agents show an empty state.)
    this.load(this.users());
    this.defaultUsers = this.users();
  }

  /** Replace the whole directory (ScenarioService uses this on a scenario swap). Re-applies the
   *  Active-only-holds-permissions rule so every surface stays consistent from one source. */
  load(list: User[]): void {
    this.users.set(list.map((u) => (u.status === 'Active' ? u : { ...u, permissionSetByModule: {} })));
  }

  /** Restore the default district directory (when leaving a demo scenario). */
  resetToDefault(): void {
    this.users.set(this.defaultUsers);
  }

  add(u: Omit<User, 'id'>): void {
    const id = `u-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
    this.users.update(list => [...list, { ...u, id }]);
  }

  update(id: string, patch: Partial<User>): void {
    this.users.update(list => list.map(u => (u.id === id ? { ...u, ...patch, id: u.id } : u)));
  }

  remove(ids: string[]): void {
    const drop = new Set(ids);
    this.users.update(list => list.filter(u => !drop.has(u.id)));
  }

  /** All users when moduleId is null; otherwise users whose `modules` include it. */
  byModule(moduleId: string | null): User[] {
    if (moduleId === null) return this.users();
    return this.users().filter(u => u.modules.includes(moduleId));
  }
}
