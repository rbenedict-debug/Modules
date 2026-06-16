export type UserStatus = 'Active' | 'Unverified' | 'Inactive' | 'Pending';
export type UserSource = 'Manual' | 'SIS' | 'Active Directory' | 'Google' | 'Azure';
export type UserRole = 'Agent' | 'District Admin' | 'School Admin' | 'Staff' | 'Teacher' | 'Parent' | 'Student';

export interface User {
  id: string; firstName: string; middleName?: string; lastName: string; email: string; phone?: string;
  status: UserStatus; source: UserSource; roles: UserRole[];
  modules: string[]; teams: string[]; locations: string[]; topics: string[];
  grade?: number; jobTitle?: string;
  employeeId?: string; pronouns?: string; emergencyContact?: string;
  permissionSetByModule: Record<string, string>;
  lastLogin?: string; dateAdded: string;
}

export type ModuleRole = 'Admin' | 'Agent';
export type ModuleAccent = 'blue'|'green'|'grey'|'navy'|'orange'|'pink'|'purple'|'red'|'teal'|'yellow';
export interface Module { id: string; name: string; icon: string; accent: ModuleAccent; role: ModuleRole; ticketCount: number; active: boolean; }

export type TeamSource = 'Manual' | 'Active Directory' | 'Azure' | 'Google';
export interface Team { id: string; name: string; modules: string[]; topics: string[]; memberIds: string[]; permissionSetId?: string; source: TeamSource; }

export type PermissionSetType = 'System' | 'Custom';
export interface PermissionSet { id: string; name: string; moduleId: string | null; type: PermissionSetType; isLocked: boolean; capabilities: Record<string, boolean | string>; }

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
