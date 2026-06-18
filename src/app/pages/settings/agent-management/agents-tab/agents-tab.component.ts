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

  private readonly modulesSvc = inject(ModulesService);
  private readonly usersSvc = inject(UsersService);
  private readonly teamsSvc = inject(TeamsService);
  private readonly setsSvc = inject(PermissionSetsService);

  private readonly cdr = inject(ChangeDetectorRef);

  readonly fullName = fullName;

  // Full, module-agnostic directory — every user, rendered once during the initial
  // render. After ngAfterViewInit the view is detached and table-init.js owns the DOM,
  // so this is a static design-mode snapshot of UsersService.
  readonly items = computed<User[]>(() => this.usersSvc.users());

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
  // `name` MUST match the <th> header labels exactly. Name/Permission Sets cells hold
  // rich markup, so those columns stay non-categorical (auto-derived filters read cell
  // textContent and would otherwise pick up emails / "+N" overflow text).
  readonly columns = [
    { name: 'Name',            width: 240, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Permission Sets', width: 240, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Status',          width: 130, type: 'badge', _categorical: true,  _badgeOptions: [
      { l: 'Active', c: 'green' }, { l: 'Pending', c: 'yellow' }, { l: 'Unverified', c: 'yellow' }, { l: 'Inactive', c: 'grey' },
    ]},
    { name: 'Module(s)',       width: 180, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Teams',           width: 180, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Locations',       width: 170, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Phone',           width: 150, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Source',          width: 150, type: 'text',  _categorical: true,  _badgeOptions: null },
    { name: 'Job Title',       width: 160, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Last Login',      width: 140, type: 'date',  _categorical: false, _badgeOptions: null },
    { name: 'Date Added',      width: 130, type: 'date',  _categorical: false, _badgeOptions: null },
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
      extraFilterGroups: [],
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

  // Overflow — show up to 2 chips per row; the rest collapse into a "+N" pill.
  private readonly PERMISSION_SET_VISIBLE = 2;
  visiblePermissionSets(u: User): string[] {
    return this.permissionSetNames(u).slice(0, this.PERMISSION_SET_VISIBLE);
  }
  permissionSetOverflow(u: User): number {
    return Math.max(0, this.permissionSetNames(u).length - this.PERMISSION_SET_VISIBLE);
  }

  statusColor(s: UserStatus): string {
    switch (s) {
      case 'Active':
        return 'green';
      case 'Pending':
      case 'Unverified':
        return 'yellow';
      case 'Inactive':
      default:
        return 'grey';
    }
  }
}
