export type UserStatus = 'Active' | 'Pending' | 'Inactive';
export type UserSource = 'Manual' | 'SIS' | 'Active Directory' | 'Google' | 'Azure';
export type UserRole = 'Agent' | 'District Admin' | 'School Admin' | 'Staff' | 'Teacher' | 'Parent' | 'Student';

export interface User {
  id: string; firstName: string; middleName?: string; lastName: string; email: string; phone?: string;
  status: UserStatus; source: UserSource; roles: UserRole[];
  modules: string[]; teams: string[]; locations: string[];
  grade?: number; jobTitle?: string;
  employeeId?: string; pronouns?: string; emergencyContact?: string;
  /** District-defined custom field values, keyed by custom-field key. TODO eng: load from the district custom-field schema. */
  customFields?: Record<string, string>;
  permissionSetByModule: Record<string, string>;
  lastLogin?: string; dateAdded: string;
}

export type ModuleRole = 'Admin' | 'Agent';
/** Each module role maps to the Agent Management permission set it represents. The department
 *  switcher shows the set's NAME (resolved live from PermissionSetsService — the single source)
 *  instead of a bare 'Admin'/'Agent', since the role is really a permission set. */
export const MODULE_ROLE_PERMISSION_SET_ID: Record<ModuleRole, string> = {
  Admin: 'ps-dept-admin',
  Agent: 'ps-team-member',
};
export type ModuleAccent = 'blue'|'green'|'grey'|'navy'|'orange'|'pink'|'purple'|'red'|'teal'|'yellow';
/** The custom-module color palette: the 9 design-system colored accents (reused via their existing
 *  --color-*-accent tokens) plus 11 K12-tailored colors defined locally (styles.scss + the icon-box /
 *  switcher color classes). Custom modules pick one of these; premade modules keep using `accent`.
 *  Grey is intentionally excluded — a custom module always carries a real color now. */
export type ModuleColor =
  | 'blue' | 'green' | 'navy' | 'orange' | 'pink' | 'purple' | 'red' | 'teal' | 'yellow'
  | 'gold' | 'lime' | 'cyan' | 'indigo' | 'magenta' | 'clay'
  | 'coral' | 'mint' | 'slate' | 'sky' | 'maroon';
export interface Module {
  id: string; name: string; icon: string; accent: ModuleAccent; ticketCount: number; active: boolean;
  /** Custom modules carry a client-chosen color (the picker palette); premade modules leave this
   *  unset and render from `accent`. Effective tile/glyph color is `color ?? accent`. */
  color?: ModuleColor;
  // Department Modules catalog copy — kept here so a module is defined exactly once: the switcher
  // reads identity (name/icon/accent/color), the Department Modules page also renders tagline + features.
  tagline: string; features: string[];
  /** A prebuilt module not yet released — shows a "Coming soon" state and can't be requested. */
  comingSoon?: boolean;
}

/** The capability areas a module can include. The active context's capabilities decide which
 *  side-nav items and Settings sections are visible. Derived from `Module.features` (the
 *  documented source of truth — see docs/ENGINEERING.md) via FEATURE_CAPABILITY. */
export type Capability = 'ticketing' | 'analytics' | 'workflow' | 'assets';

/** Maps each canonical "What's included" feature label to the capability it grants. Keeps
 *  `Module.features` the single source of truth; add a row whenever a new feature label ships. */
export const FEATURE_CAPABILITY: Record<string, Capability> = {
  'Service desk ticketing': 'ticketing',
  'Dashboard analytics': 'analytics',
  'Workflow automation and routing': 'workflow',
  'Asset management': 'assets',
};

/** The set of capabilities a module includes, derived from its feature labels. */
export function moduleCapabilities(m: Pick<Module, 'features'>): Set<Capability> {
  const caps = new Set<Capability>();
  for (const f of m.features) {
    const cap = FEATURE_CAPABILITY[f];
    if (cap) caps.add(cap);
  }
  return caps;
}

/** Shared copy + look for the reusable "Custom module" request card — a generic grey tile + gear
 *  icon (the neutral "add your own" affordance), plus the tagline + "What's included" set (ticketing
 *  + assets) every custom module shares. A custom module's real identity (name + icon + color) is
 *  chosen in the request dialog and written onto the spawned module; this template card stays
 *  generic. No `color` here, so the card renders grey via `color ?? accent`. */
export const CUSTOM_MODULE_DEFAULTS: Pick<Module, 'icon' | 'accent' | 'tagline' | 'features'> = {
  icon: 'settings',
  accent: 'grey',
  tagline: "For the occasional need the prebuilt modules don't cover, you can add a custom one of your own. It's intentionally lightweight, with ticketing and asset management, so the prebuilt modules stay your first choice whenever one fits what your team does.",
  features: ['Service desk ticketing', 'Asset management'],
};

/** A demo persona for the ⌘K/Ctrl+K persona swapper. The active persona drives the whole
 *  shell: which modules are accessible (and the role in each), whether the top-nav module
 *  switcher appears, and which nav areas are visible. Role per module lives here, not on Module. */
export interface PersonaModuleAccess { moduleId: string; role: ModuleRole; }
export interface Persona {
  id: string;
  name: string;
  title: string;
  isGlobalAdmin: boolean;
  moduleAccess: PersonaModuleAccess[];
}

export type TeamSource = 'Manual' | 'Active Directory' | 'Azure' | 'Google';
// `module` is the single department a team belongs to, or null for a district-wide (global) team
// created in the Global context. The Teams tab filters by the switcher context: a department sees
// its own teams; Global sees the null-module (global) teams.
export interface Team { id: string; name: string; module: string | null; memberIds: string[]; permissionSetId?: string; source: TeamSource; updatedAt: string; }

export type PermissionSetType = 'System' | 'Custom';
/** `isGlobalOnly` marks the global-tier admin set (Global Admin): it shows ONLY in the Global
 *  switcher context and is hidden from every department. All other system-wide sets (moduleId:
 *  null) are department-tier — shown in every department context but not in Global.
 *  `description` / `departments` / `allDepartments` / `assignedUserIds` / `assignedTeamIds` back
 *  the editor's Details tab (description + assigned users/teams) — all design-mode mock data. */
export interface PermissionSet {
  id: string;
  name: string;
  moduleId: string | null;
  type: PermissionSetType;
  isLocked: boolean;
  isGlobalOnly?: boolean;
  description?: string;
  departments?: string[];
  allDepartments?: boolean;
  assignedUserIds?: string[];
  assignedTeamIds?: string[];
  capabilities: Record<string, boolean | string>;
  updatedAt: string; // ISO timestamp; stamped on create/update by PermissionSetsService
}

/** A Marketplace integration (owned by the Integrations team). Integration Hub is district-level
 *  (global-admins-only), but a global admin can grant department modules manager access to specific
 *  integrations — `managerModuleIds` is that grant list. A granted department sees a scoped
 *  Integration Hub; empty = global-admin-managed only. See ModuleContextService.canSeeIntegrations. */
export interface Integration { id: string; name: string; managerModuleIds: string[]; }

export type TicketPriority = 'P1' | 'P2' | 'P3';
export type TicketStatus = 'Unopened' | 'In Progress' | 'Waiting' | 'Closed';
export type CustomerRole = 'Student' | 'Faculty' | 'Staff' | 'Parent/Guardian';
export interface Ticket { id: string; number: string; subject: string; description: string; customerName: string; customerRole: CustomerRole; priority: TicketPriority; status: TicketStatus; ownerName: string; moduleId: string; receivedAt: string; isMyTicket: boolean; isMyTeam: boolean; }

export const SOURCE_LOCKED_FIELDS: Record<UserSource, (keyof User)[]> = {
  'Manual': [], 'SIS': ['firstName','lastName','email','status'],
  'Active Directory': ['firstName','lastName','email','status'],
  'Google': ['firstName','lastName','email','status'], 'Azure': ['firstName','lastName','email','status'],
};
export function fullName(u: User): string { return [u.firstName, u.middleName, u.lastName].filter(Boolean).join(' '); }
