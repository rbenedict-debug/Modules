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

import { ModulesService } from '../../../../data/modules.service';
import { PermissionSetsService } from '../../../../data/permission-sets.service';
import { TeamsService } from '../../../../data/teams.service';
import { TeamSource } from '../../../../data/models';

// table-init.js is loaded globally via angular.json `scripts` and exposes this on window.
declare const OnfloTableInit: { initTable: (config: unknown) => void };

// A team row pre-resolved for the table: module names and the permission-set name are
// resolved once during the initial render, before the view is detached. The table is a
// static design-mode visual driven by table-init.js after that.
interface TeamRow {
  id: string;
  name: string;
  moduleNames: string[];
  topics: string[];
  memberCount: number;
  permissionSetName: string; // resolved name, or 'None'
  source: TeamSource;
}

@Component({
  selector: 'app-teams-tab',
  standalone: true,
  imports: [],
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

  private readonly modulesSvc = inject(ModulesService);
  private readonly teamsSvc = inject(TeamsService);
  private readonly permissionSetsSvc = inject(PermissionSetsService);

  constructor(private cdr: ChangeDetectorRef) {}

  // Fast id→name lookups for resolving module + permission-set names once during render.
  private moduleNameById(): Map<string, string> {
    const map = new Map<string, string>();
    for (const m of this.modulesSvc.modules()) map.set(m.id, m.name);
    return map;
  }

  private permSetNameById(): Map<string, string> {
    const map = new Map<string, string>();
    for (const s of this.permissionSetsSvc.sets()) map.set(s.id, s.name);
    return map;
  }

  // ── Grid rows ─────────────────────────────────────────────────────────────────
  // The FULL teams dataset, module-agnostic — every team regardless of module context.
  // Resolved to display shape once; the table is detached and static after ngAfterViewInit.
  readonly rows = signal<TeamRow[]>(this.resolveRows());

  private resolveRows(): TeamRow[] {
    const moduleNames = this.moduleNameById();
    const permSetNames = this.permSetNameById();

    return this.teamsSvc.teams().map(t => ({
      id: t.id,
      name: t.name,
      moduleNames: t.modules.map(id => moduleNames.get(id) ?? id),
      topics: t.topics,
      memberCount: t.memberIds.length,
      permissionSetName: t.permissionSetId ? (permSetNames.get(t.permissionSetId) ?? 'None') : 'None',
      source: t.source,
    }));
  }

  // Column config for table-init.js. `name` MUST match the <th> header labels exactly.
  readonly columns = [
    { name: 'Team Name',      width: 220, type: 'text',   _categorical: false, _badgeOptions: null },
    { name: 'Module(s)',      width: 200, type: 'text',   _categorical: false, _badgeOptions: null },
    { name: 'Topics',         width: 220, type: 'text',   _categorical: false, _badgeOptions: null },
    { name: 'Members',        width: 110, type: 'number', _categorical: false, _badgeOptions: null },
    { name: 'Permission Set', width: 200, type: 'text',   _categorical: true,  _badgeOptions: null },
    { name: 'Source',         width: 160, type: 'badge',  _categorical: true,  _badgeOptions: [
      { l: 'Manual', c: 'grey' }, { l: 'Active Directory', c: 'blue' }, { l: 'Azure', c: 'blue' }, { l: 'Google', c: 'blue' },
    ]},
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
      extraFilterGroups: [],
    });
    // Hand full DOM control to table-init.js after Angular's initial render.
    this.cdr.detach();
  }

  // ── Cell display helpers (run during the initial render, before detach) ──────────

  // Source → DS label color for the Source badge cell. Mirrors the column _badgeOptions.
  sourceColor(source: TeamSource): string {
    return source === 'Manual' ? 'grey' : 'blue';
  }
}
