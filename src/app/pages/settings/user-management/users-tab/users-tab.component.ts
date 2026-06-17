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
import { User, UserRole, UserStatus, fullName } from '../../../../data/models';

// table-init.js is loaded globally via angular.json `scripts` and exposes this on window.
declare const OnfloTableInit: { initTable: (config: unknown) => void };

@Component({
  selector: 'app-users-tab',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './users-tab.component.html',
  styleUrl: './users-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Transparent wrapper: the parent user-management component owns the
  // ds-page-content host, the page <h1>, and the tab bar. This tab supplies
  // only the toolbar + table + overlays.
  host: { style: 'display: contents' },
})
export class UsersTabComponent implements AfterViewInit {
  /** Emits the id of the user whose profile should open. The parent opens the drawer. */
  @Output() viewProfile = new EventEmitter<string>();

  private readonly modulesSvc = inject(ModulesService);
  private readonly usersSvc = inject(UsersService);
  private readonly teamsSvc = inject(TeamsService);

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

  teamNames(u: User): string[] {
    const map = this.teamNameById();
    return u.teams.map((id) => map.get(id) ?? id);
  }

  moduleNames(u: User): string[] {
    const map = this.moduleNameById();
    return u.modules.map((id) => map.get(id) ?? id);
  }

  // ── Column config for table-init.js ─────────────────────────────────────────────
  // `name` MUST match the <th> header labels exactly. Name/Roles cells hold rich
  // markup, so those columns stay non-categorical (auto-derived filters read cell
  // textContent and would otherwise pick up emails / "+N" overflow text).
  readonly columns = [
    { name: 'Name',       width: 240, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Roles',      width: 200, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Status',     width: 130, type: 'badge', _categorical: true,  _badgeOptions: [
      { l: 'Active', c: 'green' }, { l: 'Pending', c: 'yellow' }, { l: 'Unverified', c: 'yellow' }, { l: 'Inactive', c: 'grey' },
    ]},
    { name: 'Module(s)',  width: 180, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Teams',      width: 180, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Locations',  width: 170, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Phone',      width: 150, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Source',     width: 150, type: 'text',  _categorical: true,  _badgeOptions: null },
    { name: 'Job Title',  width: 160, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Last Login', width: 140, type: 'date',  _categorical: false, _badgeOptions: null },
    { name: 'Date Added', width: 130, type: 'date',  _categorical: false, _badgeOptions: null },
  ];

  get totalWidth(): number {
    return this.columns.reduce((sum, col) => sum + col.width, 0) + 20;
  }

  ngAfterViewInit(): void {
    OnfloTableInit.initTable({
      entity: 'User',
      entityPlural: 'users',
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

  // Roles overflow — show up to 2 chips per row; the rest collapse into a "+N" pill.
  private readonly ROLE_VISIBLE = 2;
  visibleRoles(u: User): UserRole[] {
    return u.roles.slice(0, this.ROLE_VISIBLE);
  }
  roleOverflow(u: User): number {
    return Math.max(0, u.roles.length - this.ROLE_VISIBLE);
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
