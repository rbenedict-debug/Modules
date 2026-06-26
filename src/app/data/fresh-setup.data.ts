import { User } from './models';

/**
 * The "fresh-it-setup" world — loaded by ScenarioService when the first-time global admin persona
 * (Priya Nair) is selected. It models a brand-new account the moment after first setup:
 *
 *  - Every agent is synced from Active Directory; there are NO manual entries yet.
 *  - No agent is on a team, holds a permission set, or has any custom-field values yet — EXCEPT the
 *    founding admin (Priya), who created the account and holds Global Admin.
 *  - Only the IT module is enabled.
 *
 * Teams, custom-field definitions, and custom permission sets are all empty in this scenario —
 * ScenarioService clears them when it loads this world. Dates are static ISO strings (never
 * computed from `new Date()`): the directory synced on 2026-06-25 (the day before "today"), and
 * only the founding admin has logged in so far.
 */
const SYNC_DATE = '2026-06-25T09:00:00Z';

export const FRESH_IT_USERS: User[] = [
  // Founding global admin — the person who set the account up. Synced from AD like everyone else
  // (no manual entries yet), then elevated to Global Admin. The only agent with a permission set
  // and a login so far. Name matches the 'priya' persona.
  {
    id: 'fresh-it-1', firstName: 'Priya', lastName: 'Nair', email: 'priya.nair@district.edu',
    phone: '555-0201', status: 'Active', source: 'Active Directory', roles: ['District Admin', 'Agent'],
    modules: ['it'], teams: [], locations: ['District Office'],
    jobTitle: 'Director of Technology', employeeId: 'AD-2001',
    permissionSetByModule: { it: 'ps-sysadmin' },
    lastLogin: '2026-06-26T08:05:00Z', dateAdded: SYNC_DATE,
  },
  // Synced IT staff — no team, no permission set, no custom fields, and no login yet.
  {
    id: 'fresh-it-2', firstName: 'Aaron', lastName: 'Brooks', email: 'aaron.brooks@district.edu',
    phone: '555-0202', status: 'Active', source: 'Active Directory', roles: ['Agent'],
    modules: ['it'], teams: [], locations: ['District Office'],
    jobTitle: 'Systems Administrator', employeeId: 'AD-2002',
    permissionSetByModule: {}, dateAdded: SYNC_DATE,
  },
  {
    id: 'fresh-it-3', firstName: 'Mei', lastName: 'Tanaka', email: 'mei.tanaka@district.edu',
    phone: '555-0203', status: 'Active', source: 'Active Directory', roles: ['Agent'],
    modules: ['it'], teams: [], locations: ['District Office'],
    jobTitle: 'Network Engineer', employeeId: 'AD-2003',
    permissionSetByModule: {}, dateAdded: SYNC_DATE,
  },
  {
    id: 'fresh-it-4', firstName: 'Diego', lastName: 'Morales', email: 'diego.morales@district.edu',
    phone: '555-0204', status: 'Active', source: 'Active Directory', roles: ['Agent'],
    modules: ['it'], teams: [], locations: ['Lincoln High'],
    jobTitle: 'Help Desk Technician', employeeId: 'AD-2004',
    permissionSetByModule: {}, dateAdded: SYNC_DATE,
  },
  {
    id: 'fresh-it-5', firstName: 'Fatima', lastName: 'Rahman', email: 'fatima.rahman@district.edu',
    phone: '555-0205', status: 'Active', source: 'Active Directory', roles: ['Agent'],
    modules: ['it'], teams: [], locations: ['Lincoln High'],
    jobTitle: 'Desktop Support Specialist', employeeId: 'AD-2005',
    permissionSetByModule: {}, dateAdded: SYNC_DATE,
  },
  {
    id: 'fresh-it-6', firstName: 'Greg', lastName: 'Olsen', email: 'greg.olsen@district.edu',
    phone: '555-0206', status: 'Active', source: 'Active Directory', roles: ['Agent'],
    modules: ['it'], teams: [], locations: ['Roosevelt Middle'],
    jobTitle: 'IT Support Technician', employeeId: 'AD-2006',
    permissionSetByModule: {}, dateAdded: SYNC_DATE,
  },
  {
    id: 'fresh-it-7', firstName: 'Sophie', lastName: 'Laurent', email: 'sophie.laurent@district.edu',
    phone: '555-0207', status: 'Active', source: 'Active Directory', roles: ['Agent'],
    modules: ['it'], teams: [], locations: ['District Office'],
    jobTitle: 'Systems Analyst', employeeId: 'AD-2007',
    permissionSetByModule: {}, dateAdded: SYNC_DATE,
  },
  {
    id: 'fresh-it-8', firstName: 'Trevor', lastName: 'Quinn', email: 'trevor.quinn@district.edu',
    phone: '555-0208', status: 'Active', source: 'Active Directory', roles: ['Agent'],
    modules: ['it'], teams: [], locations: ['Roosevelt Middle'],
    jobTitle: 'AV & Classroom Technology', employeeId: 'AD-2008',
    permissionSetByModule: {}, dateAdded: SYNC_DATE,
  },
  {
    id: 'fresh-it-9', firstName: 'Nadia', lastName: 'Haddad', email: 'nadia.haddad@district.edu',
    phone: '555-0209', status: 'Active', source: 'Active Directory', roles: ['Agent'],
    modules: ['it'], teams: [], locations: ['Lincoln High'],
    jobTitle: 'Help Desk Technician', employeeId: 'AD-2009',
    permissionSetByModule: {}, dateAdded: SYNC_DATE,
  },
];
