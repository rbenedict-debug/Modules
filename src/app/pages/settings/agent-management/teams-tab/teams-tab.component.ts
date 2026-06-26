import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Output,
  inject,
  signal,
} from '@angular/core';

import { DatePipe } from '@angular/common';

import { PermissionSetsService } from '../../../../data/permission-sets.service';
import { TeamsService } from '../../../../data/teams.service';
import { ModuleContextService } from '../../../../data/module-context.service';
import { TeamSource } from '../../../../data/models';

// table-init.js is loaded globally via angular.json `scripts` and exposes this on window.
declare const OnfloTableInit: { initTable: (config: unknown) => void };

// A team row pre-resolved for the table: the permission-set name is resolved once during the
// initial render, before the view is detached. The table is a static design-mode visual driven
// by table-init.js after that.
interface TeamRow {
  id: string;
  name: string;
  memberCount: number;
  permissionSetName: string; // resolved name, or 'None'
  source: TeamSource;
  updatedAt: string; // ISO timestamp; rendered via the date pipe
}

@Component({
  selector: 'app-teams-tab',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './teams-tab.component.html',
  styleUrl: './teams-tab.component.scss',
  // Transparent wrapper: the parent User Management page owns the ds-page-content host,
  // the page <h1>, and the inner-page tab bar. This tab supplies only the table content.
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamsTabComponent implements AfterViewInit {
  /** Emits when "Create Team" is clicked. The (non-detached) parent hosts the form,
   *  since this component detaches change detection for table-init.js. */
  @Output() createTeam = new EventEmitter<void>();

  /** Emits the id of the clicked team row. The parent opens the Team form — editable for
   *  manual teams, read-only for integration-synced ones. Bound during the initial render so
   *  it survives cdr.detach() + table-init's row reordering (same pattern as the Agents tab). */
  @Output() editTeam = new EventEmitter<string>();

  private readonly teamsSvc = inject(TeamsService);
  private readonly permissionSetsSvc = inject(PermissionSetsService);
  private readonly moduleCtx = inject(ModuleContextService);

  constructor(private cdr: ChangeDetectorRef) {}

  // Fast id→name lookup for resolving the permission-set name once during render.
  private permSetNameById(): Map<string, string> {
    const map = new Map<string, string>();
    for (const s of this.permissionSetsSvc.sets()) map.set(s.id, s.name);
    return map;
  }

  // ── Grid rows ─────────────────────────────────────────────────────────────────
  // Teams scoped to the switcher context (like the Permission Sets tab): a department sees its own
  // teams (`module === currentModuleId`); the Global context sees the global teams (`module ===
  // null`) — one equality covers both. Resolved to display shape once; the table is detached and
  // static after ngAfterViewInit, so the tab is re-mounted on context change (see
  // agent-management.component.html) to re-resolve for the new context.
  readonly rows = signal<TeamRow[]>(this.resolveRows());

  private resolveRows(): TeamRow[] {
    const permSetNames = this.permSetNameById();
    const moduleId = this.moduleCtx.currentModuleId();

    return this.teamsSvc.teams()
      .filter(t => t.module === moduleId)
      .map(t => ({
        id: t.id,
        name: t.name,
        memberCount: t.memberIds.length,
        permissionSetName: t.permissionSetId ? (permSetNames.get(t.permissionSetId) ?? 'None') : 'None',
        source: t.source,
        updatedAt: t.updatedAt,
      }));
  }

  // Column config for table-init.js. `name` MUST match the <th> header labels exactly.
  // Permission Set and Source are NOT _categorical: the engine's auto-facet for a text column
  // fills from an internal demo pool (placeholder names), so their realistic options are supplied
  // in `extraFilterGroups` below (trade-off chosen with the designer: those columns aren't
  // drag-to-group). Agents auto-derives a numeric-range slider; Last Updated a date-range picker.
  readonly columns = [
    { name: 'Team Name',      width: 220, type: 'text',   _categorical: false, _badgeOptions: null },
    { name: 'Agents',         width: 110, type: 'number', _categorical: false, _badgeOptions: null },
    { name: 'Permission Set', width: 200, type: 'text',   _categorical: false, _badgeOptions: null },
    { name: 'Source',         width: 160, type: 'text',   _categorical: false, _badgeOptions: null },
    { name: 'Last Updated',   width: 140, type: 'date',   _categorical: false, _badgeOptions: null },
  ];

  // ── Filter modal facets (design-mode UI simulation; eng wires the actual row-hiding) ──────
  // Real values mirrored from PermissionSetsService and the TeamSource type so the modal reads
  // like production rather than the engine's placeholder pool.
  readonly extraFilterGroups = [
    { id: 'fg-permset', label: 'Permission Set', icon: 'badge', tiers: [
      { id: 'ft-permset', label: 'Permission Set', options: [
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
    { id: 'fg-source', label: 'Source', icon: 'cloud_sync', tiers: [
      { id: 'ft-source', label: 'Source', options: [
        { id: 'fc-src-manual', label: 'Manual' },
        { id: 'fc-src-ad',     label: 'Active Directory' },
        { id: 'fc-src-azure',  label: 'Azure' },
        { id: 'fc-src-google', label: 'Google' },
      ] },
    ] },
  ];

  get totalWidth(): number {
    return this.columns.reduce((sum, col) => sum + col.width, 0) + 20;
  }

  ngAfterViewInit(): void {
    OnfloTableInit.initTable({
      entity: 'Team',
      entityPlural: 'teams',
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

  // ── Row click → open the team (edit, or read-only if synced) ─────────────────────
  // Bound during the initial render, so it survives cdr.detach() + table-init's row
  // reordering. The parent listens on (editTeam) and hosts the form.
  openTeam(id: string): void {
    this.editTeam.emit(id);
  }
}
