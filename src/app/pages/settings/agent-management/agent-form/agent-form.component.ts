import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ModulesService } from '../../../../data/modules.service';
import { PermissionSetsService } from '../../../../data/permission-sets.service';
import { TeamsService } from '../../../../data/teams.service';
import { UsersService } from '../../../../data/users.service';
import { MessagingService } from '../../../../data/messaging.service';
import { SOURCE_LOCKED_FIELDS, User, UserSource } from '../../../../data/models';
import { FormSelectComponent } from '../form-select.component';

// One module-access grant in the form: a department + the permission set that grants
// capabilities there + the (optional) teams that route work. select.js owns the live
// selection; these values seed the controls (edit) and key the @for (add/remove rows).
interface AccessRow {
  id: number;
  moduleName: string;
  permissionSetName: string;
  teamNames: string[];
}

// A district-defined custom field. TODO eng: load these from the district's custom-field
// schema; an integration can toggle individual fields on/off (drop them from this list).
interface CustomFieldDef {
  key: string;
  label: string;
  type: 'text' | 'select';
  options?: string[];
  placeholder?: string;
}

let rowUid = 0;

/**
 * Create / Edit Agent popup. Driven by the design-system `ds-modal` over a scrim. Two modes:
 *  - Create (no `agent`): source is Manual, every field editable, activation-type radios.
 *  - Edit (`agent` set): pre-filled. A synced agent locks the integration-managed fields
 *    (SOURCE_LOCKED_FIELDS) as disabled "Managed by {source}" controls behind an info banner;
 *    the rest stay editable. This is the "limited fields on a synced entry" behaviour.
 *
 * Design-mode contract: text/radio fields are native + uncontrolled, dropdowns are run by
 * `runtime/select.js`, and submit is mocked (success toast + close). Real binding, validation,
 * field-level integration toggles, and persistence are the eng team's job.
 */
@Component({
  selector: 'app-agent-form',
  standalone: true,
  imports: [FormSelectComponent],
  templateUrl: './agent-form.component.html',
  styleUrl: './agent-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentFormComponent implements OnInit {
  // Classic @Input (codebase convention) bridged to a signal so the computeds below react.
  private readonly agentSig = signal<User | null>(null);
  @Input() set agent(value: User | null) {
    this.agentSig.set(value);
  }

  /** Close without saving (Cancel, ×, scrim click, Escape). */
  @Output() close = new EventEmitter<void>();
  /** Mock save committed — parent may refresh. */
  @Output() saved = new EventEmitter<void>();

  private readonly modulesSvc = inject(ModulesService);
  private readonly setsSvc = inject(PermissionSetsService);
  private readonly teamsSvc = inject(TeamsService);
  private readonly usersSvc = inject(UsersService);
  private readonly msg = inject(MessagingService);

  // ── Mode + synced-field locking ────────────────────────────────────────────────
  readonly isEdit = computed(() => !!this.agentSig());
  readonly source = computed<UserSource>(() => this.agentSig()?.source ?? 'Manual');
  readonly isSynced = computed(() => this.source() !== 'Manual');
  private readonly lockedFields = computed(() => new Set<keyof User>(SOURCE_LOCKED_FIELDS[this.source()]));

  /** A field is locked when the agent is synced and the integration manages that field. */
  locked(field: keyof User): boolean {
    return this.isSynced() && this.lockedFields().has(field);
  }

  readonly title = computed(() => (this.isEdit() ? 'Edit Agent' : 'Create New Agent'));
  readonly subtitle = computed(() =>
    this.isEdit() ? 'Update this agent’s information' : 'Add a new agent to the system',
  );

  // ── Option lists ─────────────────────────────────────────────────────────────────
  readonly departments = computed(() => this.modulesSvc.modules().filter((m) => m.active).map((m) => m.name));
  // TODO eng: scope permission-set and team options to the row's selected department.
  readonly permissionSetNames = computed(() => this.setsSvc.sets().map((s) => s.name));
  readonly teamNames = computed(() => this.teamsSvc.teams().map((t) => t.name));
  readonly locationOptions = computed(() => {
    const seen = new Set<string>();
    for (const u of this.usersSvc.users()) for (const loc of u.locations) seen.add(loc);
    return [...seen].sort();
  });
  readonly statusOptions = ['Active', 'Unverified', 'Inactive', 'Pending'];

  /** Agent's current values (edit pre-fill). */
  readonly editing = computed(() => this.agentSig());
  readonly currentLocations = computed(() => this.agentSig()?.locations ?? []);

  readonly customFields: CustomFieldDef[] = [
    { key: 'room', label: 'Office / Room', type: 'text', placeholder: 'e.g. B-214' },
    { key: 'shift', label: 'Shift', type: 'select', options: ['Morning', 'Afternoon', 'Evening', 'Overnight'] },
    { key: 'badge', label: 'Badge ID', type: 'text', placeholder: 'Scan or enter badge ID' },
  ];

  // ── Access rows (department → permission set + teams) ───────────────────────────
  readonly accessRows = signal<AccessRow[]>([]);

  ngOnInit(): void {
    const u = this.agentSig();
    if (!u) {
      this.accessRows.set([this.emptyRow()]);
      return;
    }
    const modules = this.modulesSvc.modules();
    const sets = this.setsSvc.sets();
    const teams = this.teamsSvc.teams();
    const rows = u.modules.map<AccessRow>((moduleId) => {
      const set = sets.find((s) => s.id === u.permissionSetByModule[moduleId]);
      return {
        id: ++rowUid,
        moduleName: modules.find((m) => m.id === moduleId)?.name ?? '',
        permissionSetName: set?.name ?? '',
        teamNames: teams
          .filter((t) => u.teams.includes(t.id) && t.module === moduleId)
          .map((t) => t.name),
      };
    });
    this.accessRows.set(rows.length ? rows : [this.emptyRow()]);
  }

  private emptyRow(): AccessRow {
    return { id: ++rowUid, moduleName: '', permissionSetName: '', teamNames: [] };
  }

  addRow(): void {
    this.accessRows.update((rows) => [...rows, this.emptyRow()]);
  }

  removeRow(id: number): void {
    this.accessRows.update((rows) => (rows.length > 1 ? rows.filter((r) => r.id !== id) : rows));
  }

  // ── Actions ────────────────────────────────────────────────────────────────────
  cancel(): void {
    this.close.emit();
  }

  submit(): void {
    // TODO eng: validate + persist. Design-mode mock: toast + close.
    this.msg.success(this.isEdit() ? 'Agent updated.' : 'Agent created.');
    this.saved.emit();
    this.close.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }
}
