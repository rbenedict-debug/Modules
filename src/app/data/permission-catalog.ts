// ── Permission catalog (design-mode mock) ────────────────────────────────────────
// The full permission model ported faithfully from the Figma Make source
// (PermissionSetConfig.tsx). Two catalogs feed the editor's Actions and Settings tabs;
// Tickets & Assets appear in BOTH (action toggles vs admin segments) — that's why they
// are separate arrays, not one. Perm ids are stable keys into PermissionSet.capabilities.
//
// A perm is a binary `toggle` or a `segment` (one of segmentOptions, e.g. Hide/View/Manage).
// `manageSubOptions` overrides the Manage sub-checkboxes; `disabledByKey` gates a row on a
// sibling; `accessTier` (view/manage) drives the View Only preset; `subGroup` collapses
// consecutive rows; `notes` add callouts. `availablePresets` limits a section's preset buttons.

export type SectionPreset = 'no-access' | 'view-only' | 'full-access' | 'custom';
/** Default preset buttons offered for a section when it doesn't override `availablePresets`. */
export const SECTION_PRESETS_DEFAULT: SectionPreset[] = ['no-access', 'view-only', 'full-access', 'custom'];

export interface PermissionDef {
  id: string;
  label: string;
  description?: string;
  controlType: 'toggle' | 'segment';
  segmentOptions?: string[];
  /** Overrides the Manage sub-checkboxes (default Create/Edit/Delete) — e.g. ['Recover','Permanently Delete']. */
  manageSubOptions?: string[];
  /** Id of a sibling perm that gates this one: when that perm is off / Hide, this row is disabled. */
  disabledByKey?: string;
  /** view- vs manage-tier — drives whether a toggle is on under the View Only preset. */
  accessTier?: 'view' | 'manage';
  /** Initial value for a brand-new set (toggle bool / segment option). Defaults to off / first option. */
  defaultValue?: boolean | string;
  /** Permission-set tier this row belongs to. Omitted = inherits the section's tier (default
   *  'department'). A global permission set shows only 'global'-tier rows — e.g. Department
   *  Locations is tagged 'department' so it drops out of the otherwise-global Global section.
   *  Distinct from `accessTier` (view/manage), which is about the View Only preset. */
  tier?: 'global' | 'department';
  subGroup?: string;
  notes?: { type: 'info' | 'warning' | 'auto'; text: string }[];
}

export interface PermissionSection {
  id: string;
  label: string;
  icon: string;
  /** Render the leading icon as the filled Material Symbols variant (adds ds-icon--filled). */
  iconFilled?: boolean;
  perms: PermissionDef[];
  /** Presets this section offers (Actions Tickets/Assets omit 'view-only'). Defaults to all four. */
  availablePresets?: SectionPreset[];
  /** Permission-set tier. A 'global' section (Settings → Global) appears in a global permission
   *  set's editor; omitted = 'department' (every Actions section + the rest of Settings), which a
   *  global set hides entirely. A perm's own `tier` overrides this. See `globalTierSections`. */
  tier?: 'global' | 'department';
}

// ══════════════════════════════════════════════
// ACTIONS catalog — Tickets, Assets, Analytics, Campaigns
// ══════════════════════════════════════════════
export const ACTIONS_SECTIONS: PermissionSection[] = [
  {
    id: 'tickets',
    label: 'Tickets',
    icon: 'inbox',
    iconFilled: true,
    availablePresets: ['no-access', 'full-access', 'custom'],
    perms: [
      { id: 'tk-create-general', label: 'Create General Ticket', description: 'Controls ability to create new general tickets via the pen icon dropdown in the header.', controlType: 'toggle', accessTier: 'manage' },
      { id: 'tk-create-global', label: 'Create Global Ticket', description: 'Controls ability to create new global tickets', controlType: 'toggle', accessTier: 'manage' },
      { id: 'tk-schedule', label: 'Schedule a Ticket', description: 'Controls ability to schedule a ticket for repeated tasks', controlType: 'toggle', accessTier: 'manage' },
      { id: 'tk-add-to-global', label: 'Add to Global Ticket', description: 'Controls ability to link a ticket to a global ticket via the ticket actions dropdown.', controlType: 'toggle', accessTier: 'manage' },
      { id: 'tk-publish-global-portal', label: 'Publish Global Ticket to Customer Portal', description: 'Controls ability to publish a global ticket to the customer portal via the toggle in the global ticket view.', controlType: 'toggle', accessTier: 'manage' },
      { id: 'tk-forward', label: 'Forward Ticket', description: 'Controls ability to forward a ticket to an external email address via the ticket actions dropdown.', controlType: 'toggle', accessTier: 'manage' },
      { id: 'tk-split', label: 'Split Ticket', description: 'Controls ability to split a single ticket in two via the ticket actions dropdown.', controlType: 'toggle', accessTier: 'manage' },
      { id: 'tk-merge', label: 'Merge Ticket', description: 'Controls ability to merge multiple tickets into one when viewing the inbox', controlType: 'toggle', accessTier: 'manage' },
      { id: 'tk-disclose-confidential', label: 'Disclose Confidential Information', description: 'Controls ability to disclose confidential information within a ticket via the ticket actions dropdown.', controlType: 'toggle', accessTier: 'view' },
      { id: 'tk-mark-spam', label: 'Mark Sender as Spam', description: 'Controls ability to mark a sender address as spam via the option next to the customer email.', controlType: 'toggle', accessTier: 'manage' },
      { id: 'tk-manage-fees', label: 'Manage Fees on Tickets', description: 'Controls ability to add a fee in a ticket via the ticket actions dropdown', controlType: 'toggle', accessTier: 'manage' },
      { id: 'tk-manage-parts', label: 'Manage Parts on Tickets', description: 'Controls ability to consume parts on a ticket and manage them once added', controlType: 'toggle', accessTier: 'manage' },
      { id: 'tk-escalate', label: 'Escalate Ticket', description: 'Controls ability to escalate a ticket via the ticket actions dropdown', controlType: 'toggle', accessTier: 'manage' },
      { id: 'tk-download', label: 'Download Ticket', description: 'Controls ability to download ticket data via the ticket actions dropdown', controlType: 'toggle', accessTier: 'view' },
      { id: 'tk-edit-tags', label: 'Edit Tags', description: 'Controls ability to edit (add / remove) the tags on a ticket', controlType: 'toggle', accessTier: 'manage' },
      { id: 'tk-edit-subject', label: 'Edit Subject', description: "Controls ability to edit a ticket's subject.", controlType: 'toggle', accessTier: 'manage' },
      { id: 'tk-edit-description', label: 'Edit Description', description: "Controls ability to edit a ticket's description.", controlType: 'toggle', accessTier: 'manage' },
      { id: 'tk-edit-priority', label: 'Edit Ticket Priority', description: 'Controls ability to change the priority level of a ticket.', controlType: 'toggle', accessTier: 'manage' },
      { id: 'tk-edit-status', label: 'Edit Ticket Status', description: 'Controls ability to change the status of a ticket (e.g., Open, In Progress, Resolved, Closed).', controlType: 'toggle', accessTier: 'manage', notes: [{ type: 'info', text: 'Also affects the "Close Ticket" action' }] },
      { id: 'tk-edit-type', label: 'Edit Ticket Type', description: 'Controls ability to change the ticket type of a ticket', controlType: 'toggle', accessTier: 'manage' },
      { id: 'tk-edit-impact-on', label: 'Edit Impact On', description: "Controls ability to change the ticket's impact on entity", controlType: 'toggle', accessTier: 'manage' },
      { id: 'tk-edit-topic', label: 'Edit Ticket Topic', description: 'Controls ability to change the topic of a ticket.', controlType: 'toggle', accessTier: 'manage' },
      { id: 'tk-edit-owner', label: 'Edit Owner', description: 'Controls ability to change the owner of a ticket from its assigned team members', controlType: 'toggle', accessTier: 'manage' },
      { id: 'tk-edit-team-members', label: 'Edit Team Members', description: 'Controls ability to add or remove team members assigned to a ticket.', controlType: 'toggle', accessTier: 'manage' },
      { id: 'tk-edit-customer-details', label: 'Edit Customer Details', description: 'Controls ability to edit the customer information associated with a ticket (customer name, type, email, phone)', controlType: 'toggle', accessTier: 'manage' },
      { id: 'tk-add-internal-note', label: 'Add Internal Note', description: 'Controls ability to add internal comments within a ticket visible only to agents.', controlType: 'toggle', accessTier: 'manage' },
      { id: 'tk-reply-customer', label: 'Reply to Customer', description: 'Controls ability to send replies to customers within a ticket thread.', controlType: 'toggle', accessTier: 'manage' },
      { id: 'tk-add-normal-task', label: 'Add Normal Task', description: 'Controls ability to add normal tasks to a ticket', controlType: 'toggle', accessTier: 'manage' },
      { id: 'tk-add-approval-task', label: 'Add Approval Task', description: 'Controls ability to add approval tasks to a ticket', controlType: 'toggle', accessTier: 'manage' },
      { id: 'tk-view-call-recordings', label: 'View Call Recordings', description: 'Controls ability to access call recordings in tickets', controlType: 'toggle', accessTier: 'view' },
    ],
  },
  {
    id: 'assets',
    label: 'Assets',
    icon: 'desktop_mac',
    availablePresets: ['no-access', 'full-access', 'custom'],
    perms: [
      { id: 'as-add-asset', label: 'Add Asset', description: 'Allow manually adding new asset records using the Add Asset form', controlType: 'toggle', accessTier: 'manage' },
      { id: 'as-import-assets', label: 'Import Assets', description: 'Allow bulk-importing assets via CSV or Excel files', controlType: 'toggle', accessTier: 'manage' },
      { id: 'as-export-assets', label: 'Export Assets', description: 'Allow exporting asset data from the system', controlType: 'toggle', accessTier: 'view' },
      { id: 'as-add-purchase-order', label: 'Add Purchase Order', description: 'Allow manually creating new asset purchase orders', controlType: 'toggle', accessTier: 'manage' },
      { id: 'as-import-purchase-order', label: 'Import Purchase Order', description: 'Allow bulk-importing purchase orders via CSV or Excel files', controlType: 'toggle', accessTier: 'manage' },
      { id: 'as-assign-asset', label: 'Assign Asset', description: 'Allow assigning or reassigning assets to users or locations, including initial assignment and subsequent changes', controlType: 'toggle', accessTier: 'manage' },
      { id: 'as-unassign-asset', label: 'Unassign Asset', description: 'Allow removing or clearing the current assignment of an asset', controlType: 'toggle', accessTier: 'manage' },
      { id: 'as-loan-asset', label: 'Loan Asset', description: 'Allow loaning assets to users with a defined return date. Loans are temporary assignments', controlType: 'toggle', accessTier: 'manage' },
      { id: 'as-swap-asset', label: 'Swap Asset', description: 'Allow swapping the assignment between two assets', controlType: 'toggle', accessTier: 'manage' },
      { id: 'as-delete-asset', label: 'Delete Asset', description: 'Allow soft-deleting assets. Deleted assets move to Archived Assets where they can be recovered', controlType: 'toggle', accessTier: 'manage' },
      { id: 'as-create-repair-ticket', label: 'Create Repair Ticket', description: 'Allow creating a repair ticket for an asset from its side panel', controlType: 'toggle', accessTier: 'manage' },
      { id: 'as-batch-operations', label: 'Batch Operations', description: 'Allow access to Batch Operations (Check In, Check Out, Loan, Swap, Disposal, Repair)', controlType: 'toggle', accessTier: 'manage' },
      { id: 'as-edit-asset-name', label: 'Edit Asset Name', description: 'Allow editing the name of an asset', controlType: 'toggle', accessTier: 'manage' },
      { id: 'as-edit-tags', label: 'Edit Tags', description: 'Allow editing the tags on an asset', controlType: 'toggle', accessTier: 'manage' },
      { id: 'as-edit-asset-status', label: 'Edit Asset Status', description: 'Allow changing the status of an asset', controlType: 'toggle', accessTier: 'manage' },
      { id: 'as-edit-asset-type', label: 'Edit Asset Type', description: 'Allow changing the asset type', controlType: 'toggle', accessTier: 'manage' },
      { id: 'as-edit-asset-sub-type', label: 'Edit Asset Sub-Type', description: 'Allow changing the asset sub-type', controlType: 'toggle', accessTier: 'manage' },
      { id: 'as-edit-manufacturer', label: 'Edit Manufacturer', description: 'Allow changing the manufacturer of an asset', controlType: 'toggle', accessTier: 'manage' },
      { id: 'as-edit-model', label: 'Edit Model', description: 'Allow changing the model of an asset', controlType: 'toggle', accessTier: 'manage' },
      { id: 'as-edit-attachments', label: 'Edit Attachments', description: 'Allow adding and editing attachments on an asset', controlType: 'toggle', accessTier: 'manage' },
      { id: 'as-edit-serial-number', label: 'Edit Serial Number', description: 'Allow changing the serial number of an asset', controlType: 'toggle', accessTier: 'manage' },
      { id: 'as-edit-asset-id', label: 'Edit Asset ID', description: 'Allow changing the asset ID of an asset', controlType: 'toggle', accessTier: 'manage' },
      { id: 'as-edit-supplier', label: 'Edit Supplier', description: 'Allow changing the supplier of an asset', controlType: 'toggle', accessTier: 'manage' },
      { id: 'as-edit-funding-source', label: 'Edit Funding Source', description: 'Allow changing the funding source of an asset', controlType: 'toggle', accessTier: 'manage' },
      { id: 'as-edit-purchase-order', label: 'Edit Purchase Order', description: 'Allow changing the purchase order number of an asset', controlType: 'toggle', accessTier: 'manage' },
      { id: 'as-edit-purchase-date', label: 'Edit Purchase Date', description: 'Allow changing the purchase date of an asset', controlType: 'toggle', accessTier: 'manage' },
      { id: 'as-edit-delivery-date', label: 'Edit Delivery Date', description: 'Allow changing the delivery date of an asset', controlType: 'toggle', accessTier: 'manage' },
      { id: 'as-edit-warranty-end-date', label: 'Edit Warranty End Date', description: 'Allow changing the warranty end date of an asset', controlType: 'toggle', accessTier: 'manage' },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: 'equalizer',
    perms: [
      { id: 'an-service-overview', label: 'Service Overview Dashboard', description: 'Controls visibility of the Service Overview dashboard showing key ticket metrics for the district', controlType: 'segment', segmentOptions: ['Hide', 'View'] },
      { id: 'an-chatbot-dashboard', label: 'Chatbot Dashboard', description: 'Controls visibility of chatbot dashboards: overview, optimization, chat logs', controlType: 'segment', segmentOptions: ['Hide', 'View'] },
      { id: 'an-call-center-dashboard', label: 'Call Center Dashboard', description: 'Controls visibility of call center dashboards: overview, CSAT, call metrics, agent status', controlType: 'segment', segmentOptions: ['Hide', 'View'] },
      { id: 'an-users-comparison', label: 'Users Comparison', description: 'Controls visibility of user/agent comparison reports for performance benchmarking', controlType: 'segment', segmentOptions: ['Hide', 'View'] },
      { id: 'an-categories-comparison', label: 'Categories Comparison', description: 'Controls visibility of ticket category comparison reports', controlType: 'segment', segmentOptions: ['Hide', 'View'] },
      { id: 'an-topics-comparison', label: 'Topics Comparison', description: 'Controls visibility of ticket topic comparison reports', controlType: 'segment', segmentOptions: ['Hide', 'View'] },
      { id: 'an-custom-reports', label: 'Custom Reports', description: 'Controls visibility and management of custom reports', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
    ],
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    icon: 'campaign',
    iconFilled: true,
    perms: [
      { id: 'cp-campaigns', label: 'Campaigns', description: 'Controls visibility and management of campaigns including creation, editing, and deletion', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      { id: 'cp-contacts', label: 'Contacts', description: 'Controls visibility and management of contacts used for campaign manager', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      { id: 'cp-campaign-templates', label: 'Campaign Templates', description: 'Controls visibility and management of templates used in campaign manager', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
    ],
  },
];

// ══════════════════════════════════════════════
// SETTINGS catalog — Global, Integration Hub, Automations, Tickets, Assets, Call Center (matches the product settings nav)
// ══════════════════════════════════════════════
export const SETTINGS_SECTIONS: PermissionSection[] = [
  {
    id: 'global',
    label: 'Global',
    icon: 'language',
    tier: 'global',
    perms: [
      { id: 'gl-district-profile', label: 'District Profile', description: 'Controls visibility and management of district profile settings', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      { id: 'gl-activity-log-onflo', label: 'Onflo', description: 'Controls access to view Onflo system activity logs', controlType: 'segment', segmentOptions: ['Hide', 'View'], subGroup: 'Activity Log' },
      { id: 'gl-activity-log-assets', label: 'Assets', description: 'Controls access to view asset (ITAM) activity logs', controlType: 'segment', segmentOptions: ['Hide', 'View'], subGroup: 'Activity Log' },
      { id: 'gl-ai-training-resources', label: 'AI Training Resources', description: 'Controls visibility and management of training resources for the chatbot', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      { id: 'gl-chatbot', label: 'Chatbot', description: 'Controls visibility and management of chatbot configuration, scripts, profiles, and reports', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Edit'] },
      { id: 'gl-cx-score-templates', label: 'CX Score Templates', description: 'Controls visibility and management of customer experience score survey templates', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'], subGroup: 'Communications' },
      { id: 'gl-email', label: 'Email', description: 'Controls visibility and management of inbound and outbound email settings', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Edit'], subGroup: 'Communications' },
      { id: 'gl-response-templates', label: 'Response Templates', description: 'Controls visibility and management of email response templates used in ticket communications', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'], subGroup: 'Communications' },
      { id: 'gl-field-library', label: 'Field Library', description: 'Controls visibility and management of custom field definitions across the platform', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'], subGroup: 'Custom Fields' },
      { id: 'gl-visibility-rules', label: 'Visibility Rules', description: 'Controls visibility and management of field visibility rules', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Edit'], subGroup: 'Custom Fields' },
      { id: 'gl-department-modules', label: 'Department Modules', description: 'Controls visibility and management of department module configuration', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      { id: 'gl-keyword-alerts', label: 'Keyword Alerts', description: 'Controls visibility and management of critical alert configuration', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      { id: 'gl-labels', label: 'Labels', description: 'Controls visibility and management of label definitions', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      { id: 'gl-languages', label: 'Languages', description: 'Controls visibility and editability of language translator users to specific languages for ticket translation/routing', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Edit'] },
      { id: 'gl-live-agents', label: 'Live Agent', description: 'Controls visibility and management of live agent configuration including enabling live chat, assigning agents, and configuring quick replies', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Edit'] },
      { id: 'gl-locations-physical', label: 'Physical Locations', description: 'Controls visibility and management of physical location records (buildings, rooms)', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'], subGroup: 'Locations' },
      { id: 'gl-locations-containers', label: 'Containers', description: 'Controls visibility and management of container and storage-area location records', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'], subGroup: 'Locations' },
      { id: 'gl-locations-configurations', label: 'Configurations', description: 'Controls visibility and management of location configuration settings', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'], subGroup: 'Locations' },
      { id: 'gl-portal-branding', label: 'Portal Branding', description: 'Controls visibility and management of district portal branding', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Edit'] },
      { id: 'gl-tags-tickets', label: 'Tickets', description: 'Controls visibility and management of ticket tag definitions', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'], subGroup: 'Tags' },
      { id: 'gl-tags-assets', label: 'Assets', description: 'Controls visibility and management of asset tag definitions', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'], subGroup: 'Tags' },
      { id: 'gl-agent-management', label: 'Agent Management', description: 'Controls visibility and management of agents, teams, and permission sets', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
    ],
  },
  {
    id: 'integrations',
    label: 'Integration Hub',
    icon: 'apps',
    perms: [
      { id: 'in-api-tokens', label: 'API Tokens', description: 'Controls visibility and management of API tokens', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      { id: 'in-webhooks', label: 'Webhooks', description: 'Controls visibility and management of webhook configurations', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      { id: 'in-marketplace', label: 'Marketplace', description: 'Controls visibility and management of the integration marketplace', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      { id: 'in-installed-apps', label: 'Installed Apps', description: 'Controls visibility and management of installed integration apps', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
    ],
  },
  {
    id: 'workflows',
    label: 'Automations',
    icon: 'conversion_path',
    perms: [
      { id: 'wf-tickets', label: 'Legacy Workflows', description: 'Controls visibility and management of legacy workflow automation rules', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      { id: 'wf-assets', label: 'Workflows', description: 'Controls visibility and management of workflow automation rules', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      { id: 'wf-lookup-tables', label: 'Lookup Tables', description: 'Controls visibility and management of lookup table definitions used for dynamic workflows', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
    ],
  },
  {
    id: 'tickets',
    label: 'Tickets',
    icon: 'inbox',
    iconFilled: true,
    perms: [
      { id: 'stk-portals-it-service', label: 'Service Portals', description: 'Controls visibility and management of IT Customer Service portals', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'], subGroup: 'Portals' },
      { id: 'stk-portals-landing-page', label: 'Landing Page / Tab', description: 'Controls visibility and management of district landing pages', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'], subGroup: 'Portals' },
      { id: 'stk-portals-systems', label: 'Systems', description: 'Controls visibility and management of connected service portal systems', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'], subGroup: 'Portals' },
      { id: 'stk-forms', label: 'Forms', description: 'Controls visibility and management of ticket submission forms (form builder)', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      { id: 'stk-saved-exports', label: 'Saved Exports', description: 'Controls ability to view and add saved ticket data exports', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      { id: 'stk-slas', label: 'SLAs', description: "Controls visibility and editability of account's service level agreements (ticket aging)", controlType: 'segment', segmentOptions: ['Hide', 'View', 'Edit'] },
      { id: 'stk-scheduled-tickets', label: 'Tickets Schedule', description: 'Controls visibility and management of scheduled/recurring tickets', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      { id: 'stk-topics', label: 'Topics', description: 'Controls visibility and management of topic definitions. Topics determine ticket routing and form assignment', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'], subGroup: 'Topic Manager' },
      { id: 'stk-success-messages', label: 'Success Messages', description: 'Controls visibility and management of automatic confirmation messages sent after ticket submission', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'], subGroup: 'Topic Manager' },
    ],
  },
  {
    id: 'assets',
    label: 'Assets',
    icon: 'desktop_mac',
    perms: [
      { id: 'sas-archived-assets', label: 'Archived Assets', description: 'Controls visibility and management of soft-deleted assets. Special Manage options: Recover (restore) and Delete Permanently', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'], manageSubOptions: ['Recover', 'Permanently Delete'] },
      { id: 'sas-asset-fields', label: 'Asset Fields', description: 'Controls visibility and management of asset field definitions', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      { id: 'sas-asset-hierarchy', label: 'Asset Hierarchy', description: 'Controls visibility and management of Asset Type definitions — primary classification for assets', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      { id: 'sas-funding-sources', label: 'Funding Sources', description: 'Controls visibility and management of Funding Source definitions (Title I, General Fund, etc.)', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      { id: 'sas-manufacturers', label: 'Manufacturers', description: 'Controls visibility and management of Manufacturer definitions', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      { id: 'sas-models', label: 'Models', description: 'Controls visibility and management of product Model definitions for assets', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      { id: 'sas-purchase-order-details', label: 'Purchase Order Details', description: 'Controls visibility and management of asset purchase orders', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      { id: 'sas-statuses', label: 'Statuses', description: 'Controls visibility and management of Asset Status definitions (In Use, Available, Disposed, etc.)', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      { id: 'sas-suppliers', label: 'Suppliers', description: 'Controls visibility and management of Supplier/Vendor definitions', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
    ],
  },
  {
    id: 'call-center',
    label: 'Call Center',
    icon: 'headset_mic',
    iconFilled: true,
    perms: [
      { id: 'cc-business-hours', label: 'Business Hours', description: 'Controls visibility and management of call center business hours and holiday schedules', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      { id: 'cc-calendar', label: 'Calendar', description: 'Controls visibility and management of the call center calendar and on-call scheduling', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      { id: 'cc-call-notes', label: 'Call Notes', description: 'Controls visibility and management of call note templates and dispositions', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      { id: 'cc-contact-numbers', label: 'Contact Numbers', description: 'Controls visibility and management of inbound and outbound contact numbers', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      { id: 'cc-greetings', label: 'Greetings', description: 'Controls visibility and management of call greetings and voicemail messages', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      { id: 'cc-ivr', label: 'IVR', description: 'Controls visibility and management of IVR (interactive voice response) menus and call routing', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      { id: 'cc-queues', label: 'Queues', description: 'Controls visibility and management of call queues and queue routing rules', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
      { id: 'cc-texting', label: 'Texting', description: 'Controls visibility and management of SMS / texting configuration', controlType: 'segment', segmentOptions: ['Hide', 'View', 'Manage'] },
    ],
  },
];

// ══════════════════════════════════════════════
// Global-tier filtering
// ══════════════════════════════════════════════
/**
 * The sections a GLOBAL permission set's editor shows: keep only 'global'-tier sections, and within
 * each only its 'global'-tier perms (a perm's own `tier` overrides the section's; omitted inherits
 * the section, which defaults to 'department'). Department-tier sections — every ACTIONS section,
 * plus Integration Hub/Automations/Tickets/Assets/Call Center in SETTINGS — have zero global perms and drop out, so
 * running this over ACTIONS_SECTIONS yields []. Over SETTINGS_SECTIONS it yields just Global, minus
 * its one department-tier row (Department Locations). Pure; returns shallow-cloned sections.
 */
export function globalTierSections(sections: PermissionSection[]): PermissionSection[] {
  const out: PermissionSection[] = [];
  for (const section of sections) {
    const sectionTier = section.tier ?? 'department';
    const perms = section.perms.filter(p => (p.tier ?? sectionTier) === 'global');
    if (perms.length > 0) out.push({ ...section, perms });
  }
  return out;
}

// ══════════════════════════════════════════════
// Data-Visibility option lists (Assets filter builder)
// ══════════════════════════════════════════════
export const PSET_ASSET_TYPES: string[] = [
  'Chromebook', 'iPad', 'Desktop Computer', 'Laptop', 'Projector', 'Printer',
  'Network Switch', 'HVAC Unit', 'School Bus', 'Security Camera', 'Smartboard', 'Copier',
];
export const PSET_USER_TYPES: string[] = ['Student', 'Staff', 'Teacher'];
export const PSET_GRADES: string[] = [
  'Pre-K', 'Kindergarten', '1st', '2nd', '3rd', '4th', '5th', '6th',
  '7th', '8th', '9th', '10th', '11th', '12th',
];

// ══════════════════════════════════════════════
// Role preset states — the read-only configuration each system role renders with.
// Keyed by our set names (Global Admin = the source's "System Administrator").
// toggles/segments are keyed by the perm ids above. ticketScope/assetScope feed Data Visibility.
// ══════════════════════════════════════════════
export interface RolePresetState {
  ticketScope: string;
  assetScope: string;
  toggles: Record<string, boolean>;
  segments: Record<string, string>;
}

export const ROLE_PRESET_STATES: Record<string, RolePresetState> = {
  'Global Admin': {
    ticketScope: 'all',
    assetScope: 'all',
    toggles: {
      'tk-create-general': true, 'tk-create-global': true, 'tk-schedule': true, 'tk-add-to-global': true,
      'tk-publish-global-portal': true, 'tk-forward': true, 'tk-split': true, 'tk-merge': true,
      'tk-disclose-confidential': true, 'tk-mark-spam': true, 'tk-manage-fees': true, 'tk-manage-parts': true,
      'tk-escalate': true, 'tk-download': true, 'tk-edit-tags': true, 'tk-edit-subject': true,
      'tk-edit-description': true, 'tk-edit-priority': true, 'tk-edit-status': true, 'tk-edit-type': true,
      'tk-edit-impact-on': true, 'tk-edit-topic': true, 'tk-edit-owner': true, 'tk-edit-team-members': true,
      'tk-edit-customer-details': true, 'tk-add-internal-note': true, 'tk-reply-customer': true,
      'tk-add-normal-task': true, 'tk-add-approval-task': true, 'tk-view-call-recordings': true,
      'as-add-asset': true, 'as-import-assets': true, 'as-export-assets': true, 'as-add-purchase-order': true,
      'as-import-purchase-order': true, 'as-assign-asset': true, 'as-unassign-asset': true, 'as-loan-asset': true,
      'as-swap-asset': true, 'as-delete-asset': true, 'as-create-repair-ticket': true, 'as-batch-operations': true,
      'as-edit-asset-name': true, 'as-edit-tags': true, 'as-edit-asset-status': true, 'as-edit-asset-type': true,
      'as-edit-asset-sub-type': true, 'as-edit-manufacturer': true, 'as-edit-model': true, 'as-edit-attachments': true,
      'as-edit-serial-number': true, 'as-edit-asset-id': true, 'as-edit-supplier': true, 'as-edit-funding-source': true,
      'as-edit-purchase-order': true, 'as-edit-purchase-date': true, 'as-edit-delivery-date': true, 'as-edit-warranty-end-date': true,
    },
    segments: {
      'an-service-overview': 'View', 'an-chatbot-dashboard': 'View', 'an-call-center-dashboard': 'View',
      'an-users-comparison': 'View', 'an-categories-comparison': 'View', 'an-topics-comparison': 'View',
      'an-custom-reports': 'Manage',
      'cp-campaigns': 'Manage', 'cp-contacts': 'Manage', 'cp-campaign-templates': 'Manage',
      'gl-district-profile': 'Manage', 'gl-activity-log-onflo': 'View', 'gl-activity-log-assets': 'View',
      'gl-ai-training-resources': 'Manage', 'gl-chatbot': 'Edit',
      'gl-cx-score-templates': 'Manage', 'gl-email': 'Edit', 'gl-response-templates': 'Manage',
      'gl-field-library': 'Manage', 'gl-visibility-rules': 'Edit',
      'gl-department-modules': 'Manage', 'gl-keyword-alerts': 'Manage', 'gl-labels': 'Manage',
      'gl-languages': 'Edit', 'gl-live-agents': 'Edit',
      'gl-locations-physical': 'Manage', 'gl-locations-containers': 'Manage', 'gl-locations-configurations': 'Manage',
      'gl-portal-branding': 'Edit', 'gl-tags-tickets': 'Manage', 'gl-tags-assets': 'Manage', 'gl-agent-management': 'Manage',
      'stk-portals-it-service': 'Manage', 'stk-portals-landing-page': 'Manage', 'stk-portals-systems': 'Manage', 'stk-forms': 'Manage',
      'stk-saved-exports': 'Manage', 'stk-scheduled-tickets': 'Manage', 'stk-slas': 'Edit',
      'stk-topics': 'Manage', 'stk-success-messages': 'Manage',
      'sas-archived-assets': 'Manage', 'sas-asset-fields': 'Manage', 'sas-asset-hierarchy': 'Manage',
      'sas-funding-sources': 'Manage', 'sas-manufacturers': 'Manage', 'sas-models': 'Manage',
      'sas-purchase-order-details': 'Manage', 'sas-statuses': 'Manage', 'sas-suppliers': 'Manage',
      'wf-tickets': 'Manage', 'wf-assets': 'Manage', 'wf-lookup-tables': 'Manage',
      'in-api-tokens': 'Manage', 'in-webhooks': 'Manage', 'in-marketplace': 'Manage', 'in-installed-apps': 'Manage',
      'cc-business-hours': 'Manage', 'cc-calendar': 'Manage', 'cc-call-notes': 'Manage', 'cc-contact-numbers': 'Manage',
      'cc-greetings': 'Manage', 'cc-ivr': 'Manage', 'cc-queues': 'Manage', 'cc-texting': 'Manage',
    },
  },
  'Global User': {
    ticketScope: 'all',
    assetScope: 'all',
    toggles: {
      'tk-create-general': true, 'tk-create-global': true, 'tk-schedule': true, 'tk-add-to-global': true,
      'tk-publish-global-portal': true, 'tk-forward': true, 'tk-split': true, 'tk-merge': true,
      'tk-disclose-confidential': true, 'tk-mark-spam': true, 'tk-manage-fees': true, 'tk-manage-parts': true,
      'tk-escalate': true, 'tk-download': true, 'tk-edit-tags': true, 'tk-edit-subject': true,
      'tk-edit-description': true, 'tk-edit-priority': true, 'tk-edit-status': true, 'tk-edit-type': true,
      'tk-edit-impact-on': true, 'tk-edit-topic': true, 'tk-edit-owner': true, 'tk-edit-team-members': true,
      'tk-edit-customer-details': true, 'tk-add-internal-note': true, 'tk-reply-customer': true,
      'tk-add-normal-task': true, 'tk-add-approval-task': true, 'tk-view-call-recordings': true,
      'as-add-asset': true, 'as-import-assets': true, 'as-export-assets': true, 'as-add-purchase-order': true,
      'as-import-purchase-order': true, 'as-assign-asset': true, 'as-unassign-asset': true, 'as-loan-asset': true,
      'as-swap-asset': true, 'as-delete-asset': true, 'as-create-repair-ticket': true, 'as-batch-operations': true,
      'as-edit-asset-name': true, 'as-edit-tags': true, 'as-edit-asset-status': true, 'as-edit-asset-type': true,
      'as-edit-asset-sub-type': true, 'as-edit-manufacturer': true, 'as-edit-model': true, 'as-edit-attachments': true,
      'as-edit-serial-number': true, 'as-edit-asset-id': true, 'as-edit-supplier': true, 'as-edit-funding-source': true,
      'as-edit-purchase-order': true, 'as-edit-purchase-date': true, 'as-edit-delivery-date': true, 'as-edit-warranty-end-date': true,
    },
    segments: {
      'an-service-overview': 'View', 'an-chatbot-dashboard': 'View', 'an-call-center-dashboard': 'Hide',
      'an-users-comparison': 'View', 'an-categories-comparison': 'View', 'an-topics-comparison': 'View',
      'an-custom-reports': 'Hide',
      'cp-campaigns': 'Hide', 'cp-contacts': 'Hide', 'cp-campaign-templates': 'Hide',
      'gl-district-profile': 'Hide', 'gl-activity-log-onflo': 'Hide', 'gl-activity-log-assets': 'Hide',
      'gl-ai-training-resources': 'Hide', 'gl-chatbot': 'Hide',
      'gl-cx-score-templates': 'Hide', 'gl-email': 'Hide', 'gl-response-templates': 'Hide',
      'gl-field-library': 'Hide', 'gl-visibility-rules': 'Hide',
      'gl-department-modules': 'Hide', 'gl-keyword-alerts': 'Hide', 'gl-labels': 'Hide',
      'gl-languages': 'Hide', 'gl-live-agents': 'Hide',
      'gl-locations-physical': 'Hide', 'gl-locations-containers': 'Hide', 'gl-locations-configurations': 'Hide',
      'gl-portal-branding': 'Hide', 'gl-tags-tickets': 'Manage', 'gl-tags-assets': 'Hide', 'gl-agent-management': 'Hide',
      'stk-portals-it-service': 'Hide', 'stk-portals-landing-page': 'Hide', 'stk-portals-systems': 'Hide', 'stk-forms': 'Hide',
      'stk-saved-exports': 'Manage', 'stk-scheduled-tickets': 'Hide', 'stk-slas': 'Hide',
      'stk-topics': 'Hide', 'stk-success-messages': 'Hide',
      'sas-archived-assets': 'Hide', 'sas-asset-fields': 'Hide', 'sas-asset-hierarchy': 'Hide',
      'sas-funding-sources': 'Hide', 'sas-manufacturers': 'Hide', 'sas-models': 'Hide',
      'sas-purchase-order-details': 'Hide', 'sas-statuses': 'Hide', 'sas-suppliers': 'Hide',
      'wf-tickets': 'Hide', 'wf-assets': 'Hide', 'wf-lookup-tables': 'Hide',
      'in-api-tokens': 'Hide', 'in-webhooks': 'Hide', 'in-marketplace': 'Hide', 'in-installed-apps': 'Hide',
      'cc-business-hours': 'Hide', 'cc-calendar': 'Hide', 'cc-call-notes': 'Hide', 'cc-contact-numbers': 'Hide',
      'cc-greetings': 'Hide', 'cc-ivr': 'Hide', 'cc-queues': 'Hide', 'cc-texting': 'Hide',
    },
  },
  'Team Member': {
    ticketScope: 'assigned',
    assetScope: 'assigned',
    toggles: {
      'tk-create-general': true, 'tk-create-global': true, 'tk-schedule': true, 'tk-add-to-global': true,
      'tk-publish-global-portal': true, 'tk-forward': true, 'tk-split': true, 'tk-merge': true,
      'tk-disclose-confidential': true, 'tk-mark-spam': true, 'tk-manage-fees': true, 'tk-manage-parts': true,
      'tk-escalate': true, 'tk-download': true, 'tk-edit-tags': true, 'tk-edit-subject': true,
      'tk-edit-description': true, 'tk-edit-priority': true, 'tk-edit-status': true, 'tk-edit-type': true,
      'tk-edit-impact-on': true, 'tk-edit-topic': true, 'tk-edit-owner': true, 'tk-edit-team-members': true,
      'tk-edit-customer-details': true, 'tk-add-internal-note': true, 'tk-reply-customer': true,
      'tk-add-normal-task': true, 'tk-add-approval-task': true, 'tk-view-call-recordings': true,
      'as-add-asset': true, 'as-import-assets': false, 'as-export-assets': false, 'as-add-purchase-order': false,
      'as-import-purchase-order': false, 'as-assign-asset': true, 'as-unassign-asset': true, 'as-loan-asset': true,
      'as-swap-asset': true, 'as-delete-asset': false, 'as-create-repair-ticket': true, 'as-batch-operations': true,
      'as-edit-asset-name': true, 'as-edit-tags': true, 'as-edit-asset-status': true, 'as-edit-asset-type': false,
      'as-edit-asset-sub-type': false, 'as-edit-manufacturer': false, 'as-edit-model': false, 'as-edit-attachments': true,
      'as-edit-serial-number': false, 'as-edit-asset-id': false, 'as-edit-supplier': false, 'as-edit-funding-source': false,
      'as-edit-purchase-order': false, 'as-edit-purchase-date': false, 'as-edit-delivery-date': false, 'as-edit-warranty-end-date': false,
    },
    segments: {
      'an-service-overview': 'View', 'an-chatbot-dashboard': 'Hide', 'an-call-center-dashboard': 'Hide',
      'an-users-comparison': 'Hide', 'an-categories-comparison': 'Hide', 'an-topics-comparison': 'Hide',
      'an-custom-reports': 'Hide',
      'cp-campaigns': 'Hide', 'cp-contacts': 'Hide', 'cp-campaign-templates': 'Hide',
      'gl-district-profile': 'Hide', 'gl-activity-log-onflo': 'Hide', 'gl-activity-log-assets': 'Hide',
      'gl-ai-training-resources': 'Hide', 'gl-chatbot': 'Hide',
      'gl-cx-score-templates': 'Hide', 'gl-email': 'Hide', 'gl-response-templates': 'Hide',
      'gl-field-library': 'Hide', 'gl-visibility-rules': 'Hide',
      'gl-department-modules': 'Hide', 'gl-keyword-alerts': 'Hide', 'gl-labels': 'Hide',
      'gl-languages': 'Hide', 'gl-live-agents': 'Hide',
      'gl-locations-physical': 'Hide', 'gl-locations-containers': 'Hide', 'gl-locations-configurations': 'Hide',
      'gl-portal-branding': 'Hide', 'gl-tags-tickets': 'Manage', 'gl-tags-assets': 'Hide', 'gl-agent-management': 'Hide',
      'stk-portals-it-service': 'Hide', 'stk-portals-landing-page': 'Hide', 'stk-portals-systems': 'Hide', 'stk-forms': 'Hide',
      'stk-saved-exports': 'Manage', 'stk-scheduled-tickets': 'Hide', 'stk-slas': 'Hide',
      'stk-topics': 'Hide', 'stk-success-messages': 'Hide',
      'sas-archived-assets': 'Hide', 'sas-asset-fields': 'Hide', 'sas-asset-hierarchy': 'Hide',
      'sas-funding-sources': 'Hide', 'sas-manufacturers': 'Hide', 'sas-models': 'Hide',
      'sas-purchase-order-details': 'Hide', 'sas-statuses': 'Hide', 'sas-suppliers': 'Hide',
      'wf-tickets': 'Hide', 'wf-assets': 'Hide', 'wf-lookup-tables': 'Hide',
      'in-api-tokens': 'Hide', 'in-webhooks': 'Hide', 'in-marketplace': 'Hide', 'in-installed-apps': 'Hide',
      'cc-business-hours': 'Hide', 'cc-calendar': 'Hide', 'cc-call-notes': 'Hide', 'cc-contact-numbers': 'Hide',
      'cc-greetings': 'Hide', 'cc-ivr': 'Hide', 'cc-queues': 'Hide', 'cc-texting': 'Hide',
    },
  },
  'Recorder': {
    ticketScope: 'assigned',
    assetScope: 'assigned',
    toggles: {
      'tk-create-general': true, 'tk-create-global': true, 'tk-schedule': false, 'tk-add-to-global': true,
      'tk-publish-global-portal': false, 'tk-forward': false, 'tk-split': false, 'tk-merge': false,
      'tk-disclose-confidential': false, 'tk-mark-spam': false, 'tk-manage-fees': false, 'tk-manage-parts': false,
      'tk-escalate': false, 'tk-download': false, 'tk-edit-tags': false, 'tk-edit-subject': false,
      'tk-edit-description': false, 'tk-edit-priority': false, 'tk-edit-status': false, 'tk-edit-type': false,
      'tk-edit-impact-on': false, 'tk-edit-topic': false, 'tk-edit-owner': false, 'tk-edit-team-members': false,
      'tk-edit-customer-details': false, 'tk-add-internal-note': false, 'tk-reply-customer': false,
      'tk-add-normal-task': false, 'tk-add-approval-task': false, 'tk-view-call-recordings': false,
      'as-add-asset': false, 'as-import-assets': false, 'as-export-assets': false, 'as-add-purchase-order': false,
      'as-import-purchase-order': false, 'as-assign-asset': false, 'as-unassign-asset': false, 'as-loan-asset': false,
      'as-swap-asset': false, 'as-delete-asset': false, 'as-create-repair-ticket': false, 'as-batch-operations': false,
      'as-edit-asset-name': false, 'as-edit-tags': false, 'as-edit-asset-status': false, 'as-edit-asset-type': false,
      'as-edit-asset-sub-type': false, 'as-edit-manufacturer': false, 'as-edit-model': false, 'as-edit-attachments': false,
      'as-edit-serial-number': false, 'as-edit-asset-id': false, 'as-edit-supplier': false, 'as-edit-funding-source': false,
      'as-edit-purchase-order': false, 'as-edit-purchase-date': false, 'as-edit-delivery-date': false, 'as-edit-warranty-end-date': false,
    },
    segments: {
      'an-service-overview': 'View', 'an-chatbot-dashboard': 'Hide', 'an-call-center-dashboard': 'Hide',
      'an-users-comparison': 'Hide', 'an-categories-comparison': 'Hide', 'an-topics-comparison': 'Hide',
      'an-custom-reports': 'Hide',
      'cp-campaigns': 'Hide', 'cp-contacts': 'Hide', 'cp-campaign-templates': 'Hide',
      'gl-district-profile': 'Hide', 'gl-activity-log-onflo': 'Hide', 'gl-activity-log-assets': 'Hide',
      'gl-ai-training-resources': 'Hide', 'gl-chatbot': 'Hide',
      'gl-cx-score-templates': 'Hide', 'gl-email': 'Hide', 'gl-response-templates': 'Hide',
      'gl-field-library': 'Hide', 'gl-visibility-rules': 'Hide',
      'gl-department-modules': 'Hide', 'gl-keyword-alerts': 'Hide', 'gl-labels': 'Hide',
      'gl-languages': 'Hide', 'gl-live-agents': 'Hide',
      'gl-locations-physical': 'Hide', 'gl-locations-containers': 'Hide', 'gl-locations-configurations': 'Hide',
      'gl-portal-branding': 'Hide', 'gl-tags-tickets': 'Manage', 'gl-tags-assets': 'Hide', 'gl-agent-management': 'Hide',
      'stk-portals-it-service': 'Hide', 'stk-portals-landing-page': 'Hide', 'stk-portals-systems': 'Hide', 'stk-forms': 'Hide',
      'stk-saved-exports': 'Manage', 'stk-scheduled-tickets': 'Hide', 'stk-slas': 'Hide',
      'stk-topics': 'Hide', 'stk-success-messages': 'Hide',
      'sas-archived-assets': 'Hide', 'sas-asset-fields': 'Hide', 'sas-asset-hierarchy': 'Hide',
      'sas-funding-sources': 'Hide', 'sas-manufacturers': 'Hide', 'sas-models': 'Hide',
      'sas-purchase-order-details': 'Hide', 'sas-statuses': 'Hide', 'sas-suppliers': 'Hide',
      'wf-tickets': 'Hide', 'wf-assets': 'Hide', 'wf-lookup-tables': 'Hide',
      'in-api-tokens': 'Hide', 'in-webhooks': 'Hide', 'in-marketplace': 'Hide', 'in-installed-apps': 'Hide',
      'cc-business-hours': 'Hide', 'cc-calendar': 'Hide', 'cc-call-notes': 'Hide', 'cc-contact-numbers': 'Hide',
      'cc-greetings': 'Hide', 'cc-ivr': 'Hide', 'cc-queues': 'Hide', 'cc-texting': 'Hide',
    },
  },
  'Read Only': {
    ticketScope: 'all',
    assetScope: 'all',
    toggles: {
      'tk-create-general': false, 'tk-create-global': false, 'tk-schedule': false, 'tk-add-to-global': false,
      'tk-publish-global-portal': false, 'tk-forward': false, 'tk-split': false, 'tk-merge': false,
      'tk-disclose-confidential': false, 'tk-mark-spam': false, 'tk-manage-fees': false, 'tk-manage-parts': false,
      'tk-escalate': false, 'tk-download': false, 'tk-edit-tags': false, 'tk-edit-subject': false,
      'tk-edit-description': false, 'tk-edit-priority': false, 'tk-edit-status': false, 'tk-edit-type': false,
      'tk-edit-impact-on': false, 'tk-edit-topic': false, 'tk-edit-owner': false, 'tk-edit-team-members': false,
      'tk-edit-customer-details': false, 'tk-add-internal-note': false, 'tk-reply-customer': false,
      'tk-add-normal-task': false, 'tk-add-approval-task': false, 'tk-view-call-recordings': false,
      'as-add-asset': false, 'as-import-assets': false, 'as-export-assets': false, 'as-add-purchase-order': false,
      'as-import-purchase-order': false, 'as-assign-asset': false, 'as-unassign-asset': false, 'as-loan-asset': false,
      'as-swap-asset': false, 'as-delete-asset': false, 'as-create-repair-ticket': false, 'as-batch-operations': false,
      'as-edit-asset-name': false, 'as-edit-tags': false, 'as-edit-asset-status': false, 'as-edit-asset-type': false,
      'as-edit-asset-sub-type': false, 'as-edit-manufacturer': false, 'as-edit-model': false, 'as-edit-attachments': false,
      'as-edit-serial-number': false, 'as-edit-asset-id': false, 'as-edit-supplier': false, 'as-edit-funding-source': false,
      'as-edit-purchase-order': false, 'as-edit-purchase-date': false, 'as-edit-delivery-date': false, 'as-edit-warranty-end-date': false,
    },
    segments: {
      'an-service-overview': 'View', 'an-chatbot-dashboard': 'View', 'an-call-center-dashboard': 'View',
      'an-users-comparison': 'View', 'an-categories-comparison': 'View', 'an-topics-comparison': 'View',
      'an-custom-reports': 'View',
      'cp-campaigns': 'Hide', 'cp-contacts': 'Hide', 'cp-campaign-templates': 'Hide',
      'gl-district-profile': 'View', 'gl-activity-log-onflo': 'View', 'gl-activity-log-assets': 'View',
      'gl-ai-training-resources': 'View', 'gl-chatbot': 'View',
      'gl-cx-score-templates': 'View', 'gl-email': 'View', 'gl-response-templates': 'View',
      'gl-field-library': 'View', 'gl-visibility-rules': 'View',
      'gl-department-modules': 'View', 'gl-keyword-alerts': 'View', 'gl-labels': 'View',
      'gl-languages': 'View', 'gl-live-agents': 'View',
      'gl-locations-physical': 'View', 'gl-locations-containers': 'View', 'gl-locations-configurations': 'View',
      'gl-portal-branding': 'View', 'gl-tags-tickets': 'View', 'gl-tags-assets': 'View', 'gl-agent-management': 'View',
      'stk-portals-it-service': 'View', 'stk-portals-landing-page': 'View', 'stk-portals-systems': 'View', 'stk-forms': 'View',
      'stk-saved-exports': 'View', 'stk-scheduled-tickets': 'View', 'stk-slas': 'View',
      'stk-topics': 'View', 'stk-success-messages': 'View',
      'sas-archived-assets': 'View', 'sas-asset-fields': 'View', 'sas-asset-hierarchy': 'View',
      'sas-funding-sources': 'View', 'sas-manufacturers': 'View', 'sas-models': 'View',
      'sas-purchase-order-details': 'View', 'sas-statuses': 'View', 'sas-suppliers': 'View',
      'wf-tickets': 'View', 'wf-assets': 'View', 'wf-lookup-tables': 'View',
      'in-api-tokens': 'View', 'in-webhooks': 'View', 'in-marketplace': 'View', 'in-installed-apps': 'View',
      'cc-business-hours': 'View', 'cc-calendar': 'View', 'cc-call-notes': 'View', 'cc-contact-numbers': 'View',
      'cc-greetings': 'View', 'cc-ivr': 'View', 'cc-queues': 'View', 'cc-texting': 'View',
    },
  },
};

/** Maps a seeded set id to the role-preset that defines its read-only configuration.
 *  Custom sets (no entry) seed from a sensible default in the editor instead. */
export const SET_ROLE_PRESET: Record<string, string> = {
  'ps-sysadmin': 'Global Admin',
  'ps-dept-admin': 'Global User',
  'ps-global-user': 'Global User',
  'ps-team-member': 'Team Member',
  'ps-recorder': 'Recorder',
  'ps-readonly': 'Read Only',
};
