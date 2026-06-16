import { Injectable, signal } from '@angular/core';
import { PermissionSet } from './models';

// ── Permission catalog ────────────────────────────────────────────────────────
// The shape of the editor's left-nav sections and their per-section permission rows.
// A perm is either a binary `toggle` (on/off) or a `segment` (one of segmentOptions,
// e.g. Hide / View / Manage). `subGroup` groups consecutive perms under a collapsible
// sub-header; `notes` attach contextual info/warning/auto callouts under the label.
// Every perm `id` is a stable key into PermissionSet.capabilities.
export interface PermissionDef {
  id: string;
  label: string;
  description?: string;
  controlType: 'toggle' | 'segment';
  segmentOptions?: string[];
  subGroup?: string;
  notes?: { type: 'info' | 'warning' | 'auto'; text: string }[];
}

export interface PermissionSection {
  id: string;
  label: string;
  icon: string;
  perms: PermissionDef[];
}

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

  // The permission catalog the editor renders. This is a REPRESENTATIVE subset of the
  // full Onflo permission model — ~6–10 perms per section, a mix of toggle and segment
  // controls, a few sub-groups and notes — not the exhaustive list shipped in production.
  // Section ids match the data-visibility keys ('data-visibility') and capability keys
  // (perm.id) used by PermissionSet.capabilities.
  readonly catalog: PermissionSection[] = [
    {
      id: 'tickets',
      label: 'Tickets',
      icon: 'confirmation_number',
      perms: [
        { id: 'tk-create-general', label: 'Create general ticket', description: 'Create new general tickets from the header.', controlType: 'toggle' },
        { id: 'tk-create-global', label: 'Create global ticket', description: 'Create global tickets that fan out to many recipients.', controlType: 'toggle' },
        { id: 'tk-schedule', label: 'Schedule a ticket', description: 'Schedule a ticket for recurring tasks.', controlType: 'toggle' },
        { id: 'tk-forward', label: 'Forward ticket', description: 'Forward a ticket to an external email address.', controlType: 'toggle' },
        { id: 'tk-merge', label: 'Merge tickets', description: 'Merge multiple tickets into one from the inbox.', controlType: 'toggle' },
        { id: 'tk-confidential', label: 'Disclose confidential information', description: 'Reveal confidential content within a ticket.', controlType: 'toggle', notes: [{ type: 'warning', text: 'Exposes restricted data — grant only to trusted agents.' }] },
        { id: 'tk-edit-status', label: 'Edit ticket status', description: 'Change the status of a ticket (Open, In Progress, Closed…).', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'], notes: [{ type: 'info', text: 'Also governs the "Close Ticket" action.' }] },
        { id: 'tk-edit-priority', label: 'Edit ticket priority', description: 'Change a ticket\'s priority level.', controlType: 'toggle', subGroup: 'Edit fields' },
        { id: 'tk-edit-owner', label: 'Edit owner', description: 'Reassign a ticket to another team member.', controlType: 'toggle', subGroup: 'Edit fields' },
        { id: 'tk-edit-tags', label: 'Edit tags', description: 'Add or remove tags on a ticket.', controlType: 'toggle', subGroup: 'Edit fields' },
        { id: 'tk-reply', label: 'Reply to customer', description: 'Send replies to the customer within a ticket thread.', controlType: 'toggle' },
      ],
    },
    {
      id: 'assets',
      label: 'Assets',
      icon: 'devices',
      perms: [
        { id: 'as-add', label: 'Add asset', description: 'Manually create new asset records.', controlType: 'toggle' },
        { id: 'as-import', label: 'Import assets', description: 'Bulk-import assets via CSV or Excel.', controlType: 'toggle' },
        { id: 'as-export', label: 'Export assets', description: 'Export asset data from the system.', controlType: 'toggle' },
        { id: 'as-assign', label: 'Assign / unassign asset', description: 'Assign assets to users or locations, or clear assignments.', controlType: 'toggle' },
        { id: 'as-loan', label: 'Loan asset', description: 'Loan an asset to a user with a defined return date.', controlType: 'toggle' },
        { id: 'as-delete', label: 'Delete asset', description: 'Soft-delete assets into Archived Assets.', controlType: 'toggle', notes: [{ type: 'auto', text: 'Deleted assets are recoverable from Archived Assets.' }] },
        { id: 'as-archived', label: 'Archived assets', description: 'Recover or permanently delete soft-deleted assets.', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
        { id: 'as-edit-status', label: 'Edit asset status', description: 'Change an asset\'s status.', controlType: 'toggle', subGroup: 'Edit fields' },
        { id: 'as-edit-serial', label: 'Edit serial number', description: 'Change an asset\'s serial number.', controlType: 'toggle', subGroup: 'Edit fields' },
        { id: 'as-edit-funding', label: 'Edit funding source', description: 'Change an asset\'s funding source.', controlType: 'toggle', subGroup: 'Edit fields' },
      ],
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: 'analytics',
      perms: [
        { id: 'an-service-overview', label: 'Service overview dashboard', description: 'Key ticket metrics for the district.', controlType: 'segment', segmentOptions: ['Hide', 'View'] },
        { id: 'an-chatbot', label: 'Chatbot dashboard', description: 'Chatbot overview, optimization, and chat logs.', controlType: 'segment', segmentOptions: ['Hide', 'View'] },
        { id: 'an-call-center', label: 'Call center dashboard', description: 'Call center overview, CSAT, and agent status.', controlType: 'segment', segmentOptions: ['Hide', 'View'] },
        { id: 'an-users-comparison', label: 'Users comparison', description: 'Agent comparison reports for benchmarking.', controlType: 'segment', segmentOptions: ['Hide', 'View'] },
        { id: 'an-categories-comparison', label: 'Categories comparison', description: 'Ticket category comparison reports.', controlType: 'segment', segmentOptions: ['Hide', 'View'] },
        { id: 'an-custom-reports', label: 'Custom reports', description: 'View and build custom reports.', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      ],
    },
    {
      id: 'campaigns',
      label: 'Campaigns',
      icon: 'campaign',
      perms: [
        { id: 'cp-campaigns', label: 'Campaigns', description: 'Create, edit, and delete campaigns.', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
        { id: 'cp-contacts', label: 'Contacts', description: 'Contacts used by the campaign manager.', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
        { id: 'cp-templates', label: 'Campaign templates', description: 'Templates used in the campaign manager.', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
        { id: 'cp-send', label: 'Send campaigns', description: 'Send or schedule a campaign for delivery.', controlType: 'toggle', notes: [{ type: 'warning', text: 'Delivers to live recipients.' }] },
        { id: 'cp-export-results', label: 'Export campaign results', description: 'Export delivery and engagement results.', controlType: 'toggle' },
      ],
    },
    {
      id: 'global',
      label: 'Global',
      icon: 'language',
      perms: [
        { id: 'gl-activity-log', label: 'Activity log', description: 'View system activity logs (Onflo & ITAM).', controlType: 'segment', segmentOptions: ['Hide', 'View'] },
        { id: 'gl-chatbot', label: 'Chatbot', description: 'Chatbot configuration, scripts, and profiles.', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
        { id: 'gl-email', label: 'Email', description: 'Inbound and outbound email settings.', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'], subGroup: 'Communications' },
        { id: 'gl-response-templates', label: 'Response templates', description: 'Email response templates used in tickets.', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'], subGroup: 'Communications' },
        { id: 'gl-field-library', label: 'Field library', description: 'Custom field definitions across the platform.', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'], subGroup: 'Custom fields' },
        { id: 'gl-visibility-rules', label: 'Visibility rules', description: 'Field visibility rules.', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'], subGroup: 'Custom fields' },
        { id: 'gl-global-locations', label: 'Global locations', description: 'District-wide Buildings hierarchy and shared locations.', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'], subGroup: 'Locations' },
        { id: 'gl-department-locations', label: 'Department locations', description: 'Department-scoped Rooms, Containers, and Special Areas.', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'], subGroup: 'Locations' },
        { id: 'gl-keyword-alerts', label: 'Keyword alerts', description: 'Critical alert configuration.', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
        { id: 'gl-portal-branding', label: 'Portal branding', description: 'District portal branding.', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      ],
    },
    {
      id: 'workflows',
      label: 'Workflows',
      icon: 'conversion_path',
      perms: [
        { id: 'wf-workflows', label: 'Workflows', description: 'Workflow automation rules for tickets and assets.', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
        { id: 'wf-lookup-tables', label: 'Lookup tables', description: 'Lookup table definitions used by dynamic workflows.', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
        { id: 'wf-run-manual', label: 'Run manual workflows', description: 'Trigger a manual workflow on a record.', controlType: 'toggle' },
        { id: 'wf-edit-routing', label: 'Edit routing rules', description: 'Change how tickets are auto-routed to teams.', controlType: 'toggle', notes: [{ type: 'info', text: 'Affects every team\'s incoming queue.' }] },
        { id: 'wf-view-history', label: 'View run history', description: 'Inspect past workflow executions.', controlType: 'toggle' },
        { id: 'wf-sla', label: 'SLAs', description: 'Service level agreements (ticket aging).', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      ],
    },
    {
      id: 'integrations',
      label: 'Integrations',
      icon: 'apps',
      perms: [
        { id: 'in-fee-catalogue', label: 'Fee catalogue', description: 'SchoolCash fee catalogue per department.', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'], subGroup: 'SchoolCash' },
        { id: 'in-parts-catalogue', label: 'Parts catalogue', description: 'SchoolCash parts catalogue for repair charges.', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'], subGroup: 'SchoolCash' },
        { id: 'in-sso', label: 'Single sign-on', description: 'SAML / OIDC identity provider configuration.', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'], subGroup: 'Identity' },
        { id: 'in-directory-sync', label: 'Directory sync', description: 'Active Directory / Google / Azure user sync.', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'], subGroup: 'Identity' },
        { id: 'in-manage-keys', label: 'Manage API keys', description: 'Issue and revoke API keys.', controlType: 'toggle', notes: [{ type: 'warning', text: 'API keys grant programmatic access to district data.' }] },
        { id: 'in-webhooks', label: 'Configure webhooks', description: 'Register outbound event webhooks.', controlType: 'toggle' },
      ],
    },
  ];

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
