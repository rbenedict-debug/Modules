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

import { ModulesService } from '../../../../data/modules.service';
import { PermissionSetsService } from '../../../../data/permission-sets.service';
import { ModuleContextService } from '../../../../data/module-context.service';
import { PermissionSet } from '../../../../data/models';

// table-init.js is loaded globally via angular.json `scripts` and exposes this on window.
declare const OnfloTableInit: { initTable: (config: unknown) => void };

// A list row, resolved once for the table so cells never reach back into a service.
interface SetRow {
  id: string;
  name: string;
  type: PermissionSet['type'];
  scope: string;       // module name, or 'System-wide'
  isLocked: boolean;
}

@Component({
  selector: 'app-permission-sets-tab',
  standalone: true,
  imports: [],
  templateUrl: './permission-sets-tab.component.html',
  styleUrl: './permission-sets-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Transparent wrapper: the parent user-management component owns the ds-page-content host,
  // the page <h1>, and the tab bar. This tab supplies only the toolbar + table + overlays.
  host: { style: 'display: contents' },
})
export class PermissionSetsTabComponent implements AfterViewInit {
  /** Emits the id of the permission set whose editor should open. The parent shows it. */
  @Output() editSet = new EventEmitter<string>();

  private readonly setsSvc = inject(PermissionSetsService);
  private readonly modulesSvc = inject(ModulesService);
  private readonly moduleCtx = inject(ModuleContextService);
  private readonly cdr = inject(ChangeDetectorRef);

  // Module id → display name, for resolving each set's scope cell.
  private readonly moduleNameById = computed(() => {
    const map = new Map<string, string>();
    for (const m of this.modulesSvc.modules()) map.set(m.id, m.name);
    return map;
  });

  // Permission sets visible in the current switcher context, resolved once during the initial
  // render. After ngAfterViewInit the view is detached and table-init.js owns the DOM, so this
  // is a static snapshot — the tab is re-mounted when the module context changes (see
  // agent-management.component.html), which re-runs this against the new context.
  //  • Global context (currentModuleId === null) → only the global-tier set (Global Admin).
  //  • A department → hide Global Admin; show the system-wide (department-tier) sets plus only
  //    the custom sets scoped to the selected department.
  readonly rows = computed<SetRow[]>(() => {
    const names = this.moduleNameById();
    const moduleId = this.moduleCtx.currentModuleId();
    return this.setsSvc.sets()
      .filter(s =>
        moduleId === null
          ? s.isGlobalOnly === true
          : s.isGlobalOnly !== true && (s.moduleId === null || s.moduleId === moduleId),
      )
      .map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        scope: s.moduleId ? (names.get(s.moduleId) ?? s.moduleId) : 'System-wide',
        isLocked: s.isLocked,
      }));
  });

  // Column config for table-init.js. `name` MUST match the <th> header labels exactly.
  // Name is non-categorical (free text); Type / Status are badges; Scope is categorical
  // (module name or 'System-wide') so it gets a checkbox filter.
  readonly columns = [
    { name: 'Name',   width: 260, type: 'text',  _categorical: false, _badgeOptions: null },
    { name: 'Type',   width: 130, type: 'badge', _categorical: true,  _badgeOptions: [
      { l: 'System', c: 'blue' }, { l: 'Custom', c: 'grey' },
    ]},
    { name: 'Scope',  width: 200, type: 'text',  _categorical: true,  _badgeOptions: null },
    { name: 'Status', width: 130, type: 'badge', _categorical: true,  _badgeOptions: [
      { l: 'Locked', c: 'grey' }, { l: 'Editable', c: 'green' },
    ]},
  ];

  get totalWidth(): number {
    return this.columns.reduce((sum, col) => sum + col.width, 0) + 20;
  }

  ngAfterViewInit(): void {
    OnfloTableInit.initTable({
      entity: 'Permission set',
      entityPlural: 'permission sets',
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

  // ── The key interaction: a row click opens that set's editor ─────────────────────
  // Bound during the initial render, so it survives cdr.detach() and table-init's row
  // reordering. The parent listens on (editSet) and shows the editor for that id.
  openEditor(id: string): void {
    this.editSet.emit(id);
  }

  // Create a new Custom set (system-wide, unlocked), then open its editor. The click
  // handler is bound at the initial render, so it still fires after cdr.detach(); the
  // table itself is a static snapshot and won't show the new row until re-rendered, but
  // emitting editSet hands the user straight into the editor for the new set.
  createSet(): void {
    const name = this.nextCustomName();
    this.setsSvc.add({
      name,
      moduleId: null,
      type: 'Custom',
      isLocked: false,
      capabilities: {},
    });
    // add() appends, so the new set is last.
    const created = this.setsSvc.sets()[this.setsSvc.sets().length - 1];
    if (created) this.editSet.emit(created.id);
  }

  private nextCustomName(): string {
    const base = 'New permission set';
    const existing = new Set(this.setsSvc.sets().map(s => s.name));
    if (!existing.has(base)) return base;
    let n = 2;
    while (existing.has(`${base} ${n}`)) n++;
    return `${base} ${n}`;
  }
}
