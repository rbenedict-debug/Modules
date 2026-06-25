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

import { PermissionSetsService } from '../../../../data/permission-sets.service';
import { UsersService } from '../../../../data/users.service';
import { ModuleContextService } from '../../../../data/module-context.service';
import { PermissionSet } from '../../../../data/models';

// table-init.js is loaded globally via angular.json `scripts` and exposes this on window.
declare const OnfloTableInit: { initTable: (config: unknown) => void };

// A list row, resolved once for the table so cells never reach back into a service.
interface SetRow {
  id: string;
  name: string;
  type: PermissionSet['type'];
  agentCount: number;  // agents assigned this set in the current context
  updatedAt: string;   // ISO timestamp; rendered via the date pipe
}

@Component({
  selector: 'app-permission-sets-tab',
  standalone: true,
  imports: [DatePipe],
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
  /** Emits when "Create permission set" is clicked — the parent opens the New Permission Set modal. */
  @Output() create = new EventEmitter<void>();

  private readonly setsSvc = inject(PermissionSetsService);
  private readonly usersSvc = inject(UsersService);
  private readonly moduleCtx = inject(ModuleContextService);
  private readonly cdr = inject(ChangeDetectorRef);

  // Permission sets visible in the current switcher context, resolved once during the initial
  // render. After ngAfterViewInit the view is detached and table-init.js owns the DOM, so this
  // is a static snapshot — the tab is re-mounted when the module context changes (see
  // agent-management.component.html), which re-runs this against the new context.
  //  • Global context (currentModuleId === null) → only the global-tier set (Global Admin).
  //  • A department → hide Global Admin; show the system-wide (department-tier) sets plus only
  //    the custom sets scoped to the selected department.
  readonly rows = computed<SetRow[]>(() => {
    const moduleId = this.moduleCtx.currentModuleId();
    const agents = this.usersSvc.byModule(moduleId);

    // Agents column: how many agents in this context hold the set. In a department, match the
    // agent's set FOR THIS module; in Global there's no single module key (the global-only set is
    // assigned per-module), so count agents holding it in any of their modules.
    const countAgents = (setId: string): number =>
      moduleId === null
        ? agents.filter(u => Object.values(u.permissionSetByModule).includes(setId)).length
        : agents.filter(u => u.permissionSetByModule[moduleId] === setId).length;

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
        agentCount: countAgents(s.id),
        updatedAt: s.updatedAt,
      }));
  });

  // Column config for table-init.js. `name` MUST match the <th> header labels exactly.
  // Name is non-categorical (free text); Type is a badge; Agents is a numeric count; Last
  // Updated is a date.
  readonly columns = [
    { name: 'Name',         width: 260, type: 'text',   _categorical: false, _badgeOptions: null },
    { name: 'Type',         width: 130, type: 'badge',  _categorical: true,  _badgeOptions: [
      { l: 'System', c: 'blue' }, { l: 'Custom', c: 'grey' },
    ]},
    { name: 'Agents',       width: 110, type: 'number', _categorical: false, _badgeOptions: null },
    { name: 'Last Updated', width: 140, type: 'date',   _categorical: false, _badgeOptions: null },
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

  // "Create permission set" opens the New Permission Set modal (hosted on the parent, which
  // isn't detached). The modal collects name/description/department/copy-from, adds the set,
  // and the parent opens its editor.
  createSet(): void {
    this.create.emit();
  }
}
