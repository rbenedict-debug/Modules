import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Output,
  computed,
  inject,
} from '@angular/core';

import { DatePipe } from '@angular/common';

import { ModulesService } from '../../../../data/modules.service';
import { UsersService } from '../../../../data/users.service';
import { TeamsService } from '../../../../data/teams.service';
import { PermissionSetsService } from '../../../../data/permission-sets.service';
import { ModuleContextService } from '../../../../data/module-context.service';
import { User, UserStatus, fullName } from '../../../../data/models';

// table-init.js is loaded globally via angular.json `scripts` and exposes this on window.
declare const OnfloTableInit: { initTable: (config: unknown) => void };

@Component({
  selector: 'app-agents-tab',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './agents-tab.component.html',
  styleUrl: './agents-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Transparent wrapper: the parent agent-management component owns the
  // ds-page-content host, the page <h1>, and the tab bar. This tab supplies
  // only the toolbar + table + overlays.
  host: { style: 'display: contents' },
})
export class AgentsTabComponent implements AfterViewInit {
  /** Emits the id of the agent whose profile should open. The parent opens the drawer. */
  @Output() viewProfile = new EventEmitter<string>();

  /** Emits when "Create Agent" is clicked. The (non-detached) parent hosts the form,
   *  since this component detaches change detection for table-init.js. */
  @Output() createAgent = new EventEmitter<void>();

  private readonly modulesSvc = inject(ModulesService);
  private readonly usersSvc = inject(UsersService);
  private readonly teamsSvc = inject(TeamsService);
  private readonly setsSvc = inject(PermissionSetsService);
  private readonly moduleCtx = inject(ModuleContextService);

  private readonly cdr = inject(ChangeDetectorRef);

  readonly fullName = fullName;

  // Directory scoped to the switcher context, resolved once during the initial render: a global
  // admin in the Global context sees ALL users; scoped into a department, only that department's
  // agents (users whose `modules` include it — UsersService.byModule). After ngAfterViewInit the
  // view is detached and table-init.js owns the DOM, so this is a static snapshot — the tab is
  // re-mounted on context change (see agent-management.component.html) to re-resolve it.
  readonly items = computed<User[]>(() => this.usersSvc.byModule(this.moduleCtx.currentModuleId()));

  // ── Lookups (team id → name, module id → name) for cell rendering ──────────────
  private readonly teamNameById = computed(() => {
    const map = new Map<string, string>();
    for (const t of this.teamsSvc.teams()) map.set(t.id, t.name);
    return map;
  });

  private readonly moduleNameById = computed(() => {
    const map = new Map<string, string>();
    for (const m of this.modulesSvc.modules()) map.set(m.id, m.name);
    return map;
  });

  // Permission set id → name, for resolving each agent's assigned set(s). Reads the same
  // PermissionSetsService the agent profile and the Permission Sets table read from.
  private readonly permissionSetNameById = computed(() => {
    const map = new Map<string, string>();
    for (const s of this.setsSvc.sets()) map.set(s.id, s.name);
    return map;
  });

  teamNames(u: User): string[] {
    const map = this.teamNameById();
    return u.teams.map((id) => map.get(id) ?? id);
  }

  moduleNames(u: User): string[] {
    const map = this.moduleNameById();
    return u.modules.map((id) => map.get(id) ?? id);
  }

  // ── Column config for table-init.js ─────────────────────────────────────────────
  // `name` MUST match the <th> header labels exactly. Only Status (badge) is _categorical —
  // its facet comes from real _badgeOptions and it stays drag-to-group. The other facetable
  // columns (Permission Sets, Module(s), Teams, Locations, Source) are deliberately NOT
  // _categorical: the engine's auto-facet for a text column fills from an internal demo pool
  // (placeholder names), not real data — so their realistic options are supplied in
  // `extraFilterGroups` below. Trade-off (chosen with the designer): those columns are no
  // longer drag-to-group. Last Login / Date Added auto-derive date-range pickers.
  readonly columns = [
    { name: 'Name',            width: 240, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Email',           width: 240, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Permission Sets', width: 240, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Status',          width: 130, type: 'badge', _categorical: true,  _badgeOptions: [
      { l: 'Active', c: 'green' }, { l: 'Pending', c: 'yellow' }, { l: 'Inactive', c: 'grey' },
    ]},
    { name: 'Module(s)',       width: 180, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Teams',           width: 180, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Locations',       width: 170, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Phone',           width: 150, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Source',          width: 150, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Job Title',       width: 160, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Last Login',      width: 140, type: 'date',  _categorical: false, _badgeOptions: null },
    { name: 'Date Added',      width: 130, type: 'date',  _categorical: false, _badgeOptions: null },
  ];

  // ── Filter modal facets (design-mode UI simulation; eng wires the actual row-hiding) ──────
  // Real values mirrored from the seed data (PermissionSetsService / ModulesService /
  // TeamsService / user source + locations) so the modal reads like production rather than the
  // engine's placeholder pool. Status + the two date columns auto-derive from the column config.
  readonly extraFilterGroups = [
    { id: 'fg-permsets', label: 'Permission Sets', icon: 'badge', tiers: [
      { id: 'ft-permsets', label: 'Permission Sets', options: [
        { id: 'fc-ps-classic-triage',   label: 'Classic Triage' },
        { id: 'fc-ps-department-admin', label: 'Department Admin' },
        { id: 'fc-ps-global-admin',     label: 'Global Admin' },
        { id: 'fc-ps-global-user',      label: 'Global User' },
        { id: 'fc-ps-it-desk-lead',     label: 'IT Desk Lead' },
        { id: 'fc-ps-read-only',        label: 'Read Only' },
        { id: 'fc-ps-recorder',         label: 'Recorder' },
        { id: 'fc-ps-team-member',      label: 'Team Member' },
      ] },
    ] },
    { id: 'fg-modules', label: 'Module(s)', icon: 'apps', tiers: [
      { id: 'ft-modules', label: 'Module(s)', options: [
        { id: 'fc-mod-classic',        label: 'Classic' },
        { id: 'fc-mod-facilities',     label: 'Facilities' },
        { id: 'fc-mod-hr',             label: 'HR' },
        { id: 'fc-mod-it',             label: 'IT' },
        { id: 'fc-mod-music',          label: 'Music' },
        { id: 'fc-mod-transportation', label: 'Transportation' },
      ] },
    ] },
    { id: 'fg-teams', label: 'Teams', icon: 'groups', tiers: [
      { id: 'ft-teams', label: 'Teams', options: [
        { id: 'fc-team-classic-triage',        label: 'Classic Triage' },
        { id: 'fc-team-district-leadership',   label: 'District Leadership' },
        { id: 'fc-team-district-service-desk', label: 'District Service Desk' },
        { id: 'fc-team-emergency-response',    label: 'Emergency Response Team' },
        { id: 'fc-team-facilities-maint',      label: 'Facilities Maintenance' },
        { id: 'fc-team-hr-casework',           label: 'HR Casework' },
        { id: 'fc-team-it-help-desk',          label: 'IT Help Desk' },
        { id: 'fc-team-support',               label: 'Support' },
        { id: 'fc-team-transport-dispatch',    label: 'Transportation Dispatch' },
      ] },
    ] },
    { id: 'fg-locations', label: 'Locations', icon: 'location_on', tiers: [
      { id: 'ft-locations', label: 'Locations', options: [
        { id: 'fc-loc-district-office',  label: 'District Office' },
        { id: 'fc-loc-lincoln-high',     label: 'Lincoln High' },
        { id: 'fc-loc-roosevelt-middle', label: 'Roosevelt Middle' },
        { id: 'fc-loc-transport-depot',  label: 'Transport Depot' },
      ] },
    ] },
    { id: 'fg-source', label: 'Source', icon: 'cloud_sync', tiers: [
      { id: 'ft-source', label: 'Source', options: [
        { id: 'fc-src-manual', label: 'Manual' },
        { id: 'fc-src-sis',    label: 'SIS' },
        { id: 'fc-src-ad',     label: 'Active Directory' },
        { id: 'fc-src-google', label: 'Google' },
        { id: 'fc-src-azure',  label: 'Azure' },
      ] },
    ] },
  ];

  get totalWidth(): number {
    return this.columns.reduce((sum, col) => sum + col.width, 0) + 20;
  }

  ngAfterViewInit(): void {
    OnfloTableInit.initTable({
      entity: 'Agent',
      entityPlural: 'agents',
      columns: this.columns,
      features: {
        pivot: true, rowGroups: true, values: true,
        filter: true, columnPanel: true, contextMenu: true, paginator: false,
      },
      rows: [], // always empty — table-init.js reads rows from the rendered DOM
      extraFilterGroups: this.extraFilterGroups,
    });
    // Hand full DOM control to table-init.js after Angular's initial render.
    this.cdr.detach();
  }

  // ── The key interaction: a row click opens the customer profile ──────────────────
  // Bound during the initial render, so it survives cdr.detach() and table-init's row
  // reordering. The parent listens on (viewProfile) and opens the drawer.
  openProfile(id: string): void {
    this.viewProfile.emit(id);
  }

  // ── Cell display helpers (run during the initial render, before detach) ──────────

  // An agent's assigned permission set(s), resolved from `permissionSetByModule` via
  // PermissionSetsService — the SAME source the agent profile and the Permission Sets
  // table read from, so all three surfaces stay wired to one dataset. Distinct names
  // (an agent can hold the same set across modules), in module order.
  permissionSetNames(u: User): string[] {
    const names = this.permissionSetNameById();
    const resolved = Object.values(u.permissionSetByModule).map((id) => names.get(id) ?? id);
    return [...new Set(resolved)];
  }

  statusColor(s: UserStatus): string {
    switch (s) {
      case 'Active':
        return 'green';
      case 'Pending':
        return 'yellow';
      case 'Inactive':
      default:
        return 'grey';
    }
  }
}
