import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  imports: [FormsModule, FormSelectComponent],
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
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

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

  // ── Validation ─────────────────────────────────────────────────────────────────
  // Interaction model: errors stay hidden until the first submit attempt, then recompute
  // reactively (so ngModel fields clear as the user types; selects clear when an option is
  // picked via the click listener below). Locked (integration-managed) fields are never
  // validated — they're disabled, pre-filled, and owned by the sync.

  /** Two-way models for the required/validated text inputs — seeded from `editing()` in ngOnInit.
   *  Converting these from one-way `[value]` to `[(ngModel)]` is what makes their error state
   *  recompute (and clear) live as the user types. Optional fields stay one-way `[value]`. */
  readonly firstName = signal('');
  readonly lastName = signal('');
  readonly email = signal('');
  readonly phone = signal('');

  /** Flips true on the first submit attempt; gates ALL error display. */
  readonly submitted = signal(false);

  private static readonly EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static readonly PHONE_RE = /^\+?[\d\s().-]+$/;

  // Personal-info field validity. Each guards on `locked()` first: a locked field is integration-
  // owned and must never be flagged. Required text → invalid when blank.
  readonly firstNameInvalid = computed(() => !this.locked('firstName') && this.firstName().trim() === '');
  readonly lastNameInvalid = computed(() => !this.locked('lastName') && this.lastName().trim() === '');

  // Email: required AND format. Empty and bad-format are distinguished so the message can differ.
  readonly emailEmpty = computed(() => !this.locked('email') && this.email().trim() === '');
  readonly emailBadFormat = computed(() => {
    if (this.locked('email')) return false;
    const v = this.email().trim();
    return v !== '' && !AgentFormComponent.EMAIL_RE.test(v);
  });
  readonly emailInvalid = computed(() => this.emailEmpty() || this.emailBadFormat());
  readonly emailError = computed(() =>
    this.emailEmpty() ? 'Email address is required.' : 'Enter a valid email address.',
  );

  // Phone: OPTIONAL — only validated when non-empty. Valid when it matches the loose phone-char
  // pattern AND the digit count is 10, or 11 with a leading 1, or 7–15 (international).
  // TODO eng: replace with real phone validation (libphonenumber).
  readonly phoneInvalid = computed(() => {
    if (this.locked('phone')) return false;
    const v = this.phone().trim();
    if (v === '') return false;
    if (!AgentFormComponent.PHONE_RE.test(v)) return true;
    const d = v.replace(/[^\d]/g, '');
    const ok = d.length === 10 || (d.length === 11 && d.startsWith('1')) || (d.length >= 7 && d.length <= 15);
    return !ok;
  });

  /** Per-row select error flags, keyed by AccessRow.id. Populated at submit from a DOM read of
   *  each row's `.ds-select__control` value (select.js owns the live selection, so the chosen
   *  value lives in the DOM, not a signal). The click listener below clears a row's flag when
   *  an option is picked. */
  private readonly rowErrors = signal<Map<number, { department: boolean }>>(new Map());

  rowDepartmentInvalid(id: number): boolean {
    return this.submitted() && (this.rowErrors().get(id)?.department ?? false);
  }

  /** Read a row's required Department select from the DOM (single-select control value = chosen
   *  label, or '' when nothing is picked). Returns the invalid flag for that row. Permission Set is
   *  optional — a global admin assigns the module now; a department admin picks the set later. */
  private readRowSelectErrors(id: number): { department: boolean } {
    const root = this.host.nativeElement;
    const dept = (root.querySelector(`#af-row-dept-${id} .ds-select__control`) as HTMLInputElement | null)?.value?.trim() ?? '';
    return { department: dept === '' };
  }

  /** True when any required/format field is invalid — drives the summary banner. Selects are read
   *  from the captured `rowErrors` map (refreshed at each submit + as options are picked). */
  hasErrors(): boolean {
    if (this.firstNameInvalid() || this.lastNameInvalid() || this.emailInvalid() || this.phoneInvalid()) return true;
    return this.accessRows().some((r) => this.rowErrors().get(r.id)?.department ?? false);
  }

  ngOnInit(): void {
    const u = this.agentSig();
    // Seed the two-way models from the edit pre-fill (empty strings in create mode).
    this.firstName.set(u?.firstName ?? '');
    this.lastName.set(u?.lastName ?? '');
    this.email.set(u?.email ?? '');
    this.phone.set(u?.phone ?? '');
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
    this.submitted.set(true);

    // Selects read their chosen value from the DOM (select.js owns the live selection); capture
    // each row's required-select errors into the map the [error] bindings read.
    const errs = new Map<number, { department: boolean }>();
    for (const row of this.accessRows()) errs.set(row.id, this.readRowSelectErrors(row.id));
    this.rowErrors.set(errs);

    if (this.hasErrors()) {
      // Invalid: show field errors + the summary banner, keep the modal open, fire no toast,
      // and move focus to the first invalid control (DOM order: personal-info text, then rows).
      queueMicrotask(() => this.focusFirstInvalid());
      return;
    }

    // Valid → proceed exactly as before. TODO eng: persist. Design-mode mock: toast + close.
    this.msg.success(this.isEdit() ? 'Agent updated.' : 'Agent created.');
    this.saved.emit();
    this.close.emit();
  }

  /** Focus the first invalid control in visual (DOM) order. */
  private focusFirstInvalid(): void {
    const root = this.host.nativeElement;
    const focus = (sel: string) => (root.querySelector(sel) as HTMLElement | null)?.focus();
    if (this.firstNameInvalid()) return void focus('#af-first');
    if (this.lastNameInvalid()) return void focus('#af-last');
    if (this.emailInvalid()) return void focus('#af-email');
    if (this.phoneInvalid()) return void focus('#af-phone');
    for (const row of this.accessRows()) {
      if (this.rowErrors().get(row.id)?.department) return void focus(`#af-row-dept-${row.id} .ds-select__control`);
    }
  }

  /** Clear-as-fix for the row selects: after a submit attempt, when an option is picked anywhere in
   *  the modal, re-read every row's required selects and drop any now-satisfied error flag. The
   *  re-read is deferred via queueMicrotask so it runs after select.js (which handles the same click)
   *  has written the chosen value onto the `.ds-select__control`. Cheap — gated to post-submit. */
  @HostListener('click', ['$event'])
  onModalClick(event: MouseEvent): void {
    if (!this.submitted()) return;
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.ds-menu__item')) return;
    queueMicrotask(() => {
      const next = new Map(this.rowErrors());
      for (const row of this.accessRows()) next.set(row.id, this.readRowSelectErrors(row.id));
      this.rowErrors.set(next);
    });
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
