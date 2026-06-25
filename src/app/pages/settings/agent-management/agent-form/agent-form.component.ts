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
import { User, UserSource } from '../../../../data/models';
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
 *  - Edit (`agent` set): pre-filled. A synced agent locks ALL personal-info fields (name,
 *    email, phone, employee ID, job title, status) as disabled "Managed by {source}" controls
 *    behind an info banner; Locations and module/team access stay editable (Onflo-side data).
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

  // On a synced agent every personal-info field is owned by the integration, so it's read-only
  // here — name, email, phone, employee ID, job title, account status. Locations is intentionally
  // NOT in this set: it's an Onflo-side assignment, editable even when synced.
  // TODO eng: drive field ownership from the integration's real config.
  private static readonly INTEGRATION_MANAGED_FIELDS: ReadonlySet<keyof User> = new Set<keyof User>([
    'firstName', 'middleName', 'lastName', 'email', 'phone', 'employeeId', 'jobTitle', 'status',
  ]);

  /** A field is locked when the agent is synced and the integration owns that field. */
  locked(field: keyof User): boolean {
    return this.isSynced() && AgentFormComponent.INTEGRATION_MANAGED_FIELDS.has(field);
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
  readonly statusOptions = ['Active', 'Pending', 'Inactive'];

  /** Agent's current values (edit pre-fill). */
  readonly editing = computed(() => this.agentSig());
  readonly currentLocations = computed(() => this.agentSig()?.locations ?? []);

  /** A pending account hasn't activated yet — gates the Resend activation action beside the status. */
  readonly isPending = computed(() => this.editing()?.status === 'Pending');
  /** True while a resend-activation request is in flight — drives the Resend button's loading state. */
  readonly resending = signal(false);

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

  /** Resend the activation email to a pending agent — mirrors the profile hero action. Design-mode
   *  mock: brief loading state on the button, then a result toast (shift-click demos the failure
   *  path + Retry). TODO eng: call the real resend-activation endpoint and drive loading + result
   *  off its response. */
  resendActivation(event?: MouseEvent): void {
    const u = this.editing();
    if (!u || this.resending()) return;
    const fail = event?.shiftKey === true; // Shift-click → demo the error toast
    this.resending.set(true);
    setTimeout(() => {
      this.resending.set(false);
      if (fail) {
        this.msg.error(`Couldn’t resend the activation email to ${u.email}.`, () => this.resendActivation());
      } else {
        this.msg.success(`Activation email resent to ${u.email}.`);
      }
    }, 1200);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }
}
