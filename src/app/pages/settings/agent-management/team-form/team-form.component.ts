import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ModulesService } from '../../../../data/modules.service';
import { PermissionSetsService } from '../../../../data/permission-sets.service';
import { UsersService } from '../../../../data/users.service';
import { MessagingService } from '../../../../data/messaging.service';
import { ModuleContextService } from '../../../../data/module-context.service';
import { Team, TeamSource, fullName } from '../../../../data/models';
import { FormSelectComponent } from '../form-select.component';

/**
 * Create / Edit Team popup — a `ds-modal` over a scrim, mirroring the agent form. Maps to the
 * Team model: name, module (ONE department), permissionSetId, memberIds. Three modes:
 *  - Create (no `team`): every field editable; Department picks a single department.
 *  - Edit, manual (`team.source === 'Manual'`): pre-filled and editable.
 *  - Edit, synced (`team.source !== 'Manual'`): fully read-only — the team is owned by the
 *    integration. A `ds-alert--info` banner points to Integration Hub, fields are disabled,
 *    members render as static chips, and there is no Save (Close only).
 *
 * Design-mode contract: text fields are native + uncontrolled, dropdowns are run by
 * `runtime/select.js`, the member search is a visual stand-in, and submit is mocked (toast +
 * close). Real binding, validation, member search, and persistence are the eng team's job.
 */
@Component({
  selector: 'app-team-form',
  standalone: true,
  imports: [FormSelectComponent],
  templateUrl: './team-form.component.html',
  styleUrl: './team-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamFormComponent {
  // Classic @Input (codebase convention) bridged to a signal so the computeds below react.
  private readonly teamSig = signal<Team | null>(null);
  @Input() set team(value: Team | null) {
    this.teamSig.set(value);
  }

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  private readonly modulesSvc = inject(ModulesService);
  private readonly setsSvc = inject(PermissionSetsService);
  private readonly usersSvc = inject(UsersService);
  private readonly msg = inject(MessagingService);
  private readonly moduleCtx = inject(ModuleContextService);

  // ── Mode + synced read-only ────────────────────────────────────────────────────────
  readonly isEdit = computed(() => !!this.teamSig());
  readonly source = computed<TeamSource>(() => this.teamSig()?.source ?? 'Manual');
  /** Synced teams are owned by their integration and are fully read-only here. */
  readonly isSynced = computed(() => this.source() !== 'Manual');

  readonly title = computed(() =>
    this.isSynced() ? 'Team Details' : this.isEdit() ? 'Edit Team' : 'Create New Team',
  );
  readonly subtitle = computed(() =>
    this.isSynced()
      ? `Synced from ${this.source()} — managed in Integration Hub`
      : this.isEdit()
        ? 'Update this team’s information'
        : 'Add a new team to the system',
  );

  // ── Option lists ─────────────────────────────────────────────────────────────────────
  readonly departments = computed(() => this.modulesSvc.modules().filter((m) => m.active).map((m) => m.name));
  readonly permissionSetNames = computed(() => this.setsSvc.sets().map((s) => s.name));

  // ── Edit pre-fill (resolved from the team) ───────────────────────────────────────────
  readonly editing = computed(() => this.teamSig());
  /** A NEW team's department = the current switcher context (Global → "Global"). Teams are
   *  created for the context you're in, so this is locked in create mode. */
  readonly contextDepartmentName = computed(() => {
    const id = this.moduleCtx.currentModuleId();
    if (id === null) return 'Global';
    return this.modulesSvc.modules().find((m) => m.id === id)?.name ?? id;
  });
  /** The Department select's value: an existing team's department (Global for a null module), or
   *  the current context when creating. */
  readonly moduleName = computed(() => {
    const t = this.teamSig();
    if (!t) return this.contextDepartmentName();
    if (t.module === null) return 'Global';
    return this.modulesSvc.modules().find((m) => m.id === t.module)?.name ?? '';
  });
  readonly permissionSetName = computed(() => {
    const t = this.teamSig();
    if (!t?.permissionSetId) return '';
    return this.setsSvc.sets().find((s) => s.id === t.permissionSetId)?.name ?? '';
  });
  /** Member display names, for the read-only member chips on a synced team. */
  readonly memberNames = computed(() => {
    const t = this.teamSig();
    if (!t) return [];
    const byId = new Map(this.usersSvc.users().map((u) => [u.id, u] as const));
    return t.memberIds.map((id) => {
      const u = byId.get(id);
      return u ? fullName(u) : id;
    });
  });

  cancel(): void {
    this.close.emit();
  }

  submit(): void {
    // TODO eng: validate + persist. Design-mode mock: toast + close. (Synced teams never reach
    // here — their footer has no Save.)
    this.msg.success(this.isEdit() ? 'Team updated.' : 'Team created.');
    this.saved.emit();
    this.close.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }
}
