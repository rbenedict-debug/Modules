import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { User, UserStatus, fullName } from '../../../../data/models';
import { UsersService } from '../../../../data/users.service';
import { ModulesService } from '../../../../data/modules.service';
import { TeamsService } from '../../../../data/teams.service';
import { PermissionSetsService } from '../../../../data/permission-sets.service';
import { ChromeService } from '../../../../data/chrome.service';
import { OpenAgentTabsService } from '../../../../data/open-agent-tabs.service';
import { MessagingService } from '../../../../data/messaging.service';
import { AgentActivityTabComponent } from './agent-activity-tab/agent-activity-tab.component';
import { AgentFormComponent } from '../agent-form/agent-form.component';

// A Basic-Information row: a label with one value or several stacked values. Mirrors the
// User-Explorer profile's field model so the template stays data-driven.
interface InfoField {
  label: string;
  value: string | string[];
  // Leading icon + tint on a single-value field (Account Status, Source).
  icon?: string;
  iconColor?: 'green' | 'yellow' | 'grey' | 'purple' | 'blue';
}

// One module the agent belongs to, with its permission set + the teams scoped to it.
interface ModulePermissionCard {
  id: string;
  name: string;
  icon: string;
  accent: string;
  permissionSetName: string;
  teams: string[];
}

// Which information panel shows below the hero.
type TabId = 'details' | 'permissions' | 'activity';
interface ProfileTab { id: TabId; label: string; }

// Status → DS label colour (matches the agents table + the former drawer).
const STATUS_COLOR: Record<UserStatus, 'green' | 'yellow' | 'grey'> = {
  Active: 'green',
  Pending: 'yellow',
  Inactive: 'grey',
};

/**
 * Full-page agent profile — the page that replaced the slide-out profile drawer.
 * Reached at /settings/agent-management/:id from an Agents-table row click. The
 * layout mirrors the User-Explorer end-user profile (full-width hero + basic info
 * over a 70/30 split) so agents and end users read the same way; the section
 * content is agent-specific (module permissions, owned tickets).
 */
@Component({
  selector: 'app-agent-profile',
  standalone: true,
  imports: [RouterLink, AgentActivityTabComponent, AgentFormComponent],
  templateUrl: './agent-profile.component.html',
  styleUrl: './agent-profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ds-page-content', role: 'main' },
})
export class AgentProfileComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly usersSvc = inject(UsersService);
  private readonly modulesSvc = inject(ModulesService);
  private readonly teamsSvc = inject(TeamsService);
  private readonly permissionSetsSvc = inject(PermissionSetsService);
  // Collapses the section subnav while this full-area profile is on screen and restores it
  // on leave — the same shell mechanism the permission-set editor uses for its takeover view.
  private readonly chrome = inject(ChromeService);
  private readonly msg = inject(MessagingService);
  // Opening this profile registers it as a top-nav tab (see the constructor).
  private readonly openTabs = inject(OpenAgentTabsService);

  // Agent id from the route; reactive so navigating between profiles updates the view.
  private readonly agentId = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('id') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('id') ?? '' },
  );

  readonly user = computed<User | undefined>(() =>
    this.usersSvc.users().find((u) => u.id === this.agentId()),
  );

  constructor() {
    // Opening (or navigating between) an agent profile spawns/focuses its top-nav tab. An effect so
    // a row click, a deep-link, and a refresh all register the tab; open() is idempotent (no dupes).
    effect(() => {
      const id = this.agentId();
      if (id) this.openTabs.open(id);
    });
  }

  // ── Tabs (Details / Permissions / Activity) ───────────────────────────────────
  readonly tabs: ProfileTab[] = [
    { id: 'details', label: 'Details' },
    { id: 'permissions', label: 'Permissions' },
    { id: 'activity', label: 'Activity' },
  ];
  readonly activeTab = signal<TabId>('details');

  /** True while the Edit Agent form is open (this page is not detached, so a signal drives it). */
  readonly editOpen = signal(false);

  /** True while a resend-activation request is in flight — drives the Resend button's loading state. */
  readonly resending = signal(false);
  // The Activity tab hosts the canonical table-init.js engine, which takes over the DOM,
  // detaches change detection, and binds every element by GLOBAL id. It renders only while
  // active (inside the @switch) so the engine mounts lazily and never shares the DOM with
  // the shell's other engine tables — see AgentActivityTabComponent.

  ngOnInit(): void {
    // Full-area takeover view: collapse the subnav on open, restore it on leave.
    this.chrome.setEditorOpen(true);
  }

  ngOnDestroy(): void {
    this.chrome.setEditorOpen(false);
  }

  // ── Hero helpers ─────────────────────────────────────────────────────────────
  readonly fullName = computed(() => {
    const u = this.user();
    return u ? fullName(u) : '';
  });

  readonly initials = computed(() => {
    const u = this.user();
    if (!u) return '';
    return `${u.firstName.charAt(0)}${u.lastName.charAt(0)}`.toUpperCase();
  });

  readonly statusColor = computed(() => {
    const u = this.user();
    return u ? STATUS_COLOR[u.status] : 'grey';
  });

  /** A pending account hasn't activated yet — drives the hero's Resend activation action. */
  readonly isPending = computed(() => this.user()?.status === 'Pending');

  readonly isAgent = computed(() => !!this.user()?.roles.includes('Agent'));

  /** Resend the activation email to a pending agent. Design-mode mock: show a brief loading
   *  state on the button, then a result toast. Shift-clicking demos the failure path (error
   *  toast + Retry, where Retry re-runs the success path). TODO eng: call the real
   *  resend-activation endpoint and drive the loading + result off its response. */
  resendActivation(event?: MouseEvent): void {
    const u = this.user();
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

  // ── Basic Information ─────────────────────────────────────────────────────────
  // The 12 standard fields, data-driven from the User model. Integration provenance is shown
  // once via the Source field; the per-field "Managed by" notes were removed (clutter on the
  // profile). Locked/managed fields surface in the Edit Agent form instead.
  readonly basicInfo = computed<InfoField[]>(() => {
    const u = this.user();
    if (!u) return [];

    const synced = u.source !== 'Manual';

    return [
      { label: 'First Name', value: u.firstName },
      { label: 'Last Name', value: u.lastName },
      { label: 'Middle Name', value: u.middleName || '—' },
      { label: 'Email', value: u.email },
      { label: 'Phone', value: u.phone || '—' },
      { label: 'Job Title', value: u.jobTitle || '—' },
      { label: 'Employee ID', value: u.employeeId || '—' },
      { label: 'Source', value: u.source, icon: synced ? 'sync' : undefined, iconColor: synced ? 'blue' : undefined },
      { label: 'Account Status', value: u.status },
      { label: 'Locations', value: u.locations.length ? u.locations : '—' },
      { label: 'Date Added', value: this.formatDate(u.dateAdded) },
      { label: 'Last Login', value: this.formatDate(u.lastLogin) },
    ];
  });

  /** Normalize a field's value to a list so single- and multi-value fields render the same. */
  fieldValues(field: InfoField): string[] {
    return Array.isArray(field.value) ? field.value : [field.value];
  }

  // ── Custom Fields ──────────────────────────────────────────────────────────────
  // District-defined custom fields, shown in their own section below Basic Information.
  // Anything beyond the 12 standard fields lives here. Definitions mirror the Create/Edit
  // Agent form's set; each renders this agent's value (or "—" when unset).
  // TODO eng: load these definitions from the district's custom-field schema (an integration
  // can toggle individual fields on/off) and read values from User.customFields — not a static list.
  private readonly customFieldDefs: { key: string; label: string }[] = [
    { key: 'room', label: 'Office / Room' },
    { key: 'shift', label: 'Shift' },
    { key: 'badge', label: 'Badge ID' },
  ];

  readonly customFields = computed<InfoField[]>(() => {
    const u = this.user();
    if (!u) return [];
    const values = u.customFields ?? {};
    return this.customFieldDefs.map((def) => ({
      label: def.label,
      value: values[def.key] || '—',
    }));
  });

  // ── Permissions (per module the agent belongs to) ─────────────────────────────
  readonly modulePermissionCards = computed<ModulePermissionCard[]>(() => {
    const u = this.user();
    if (!u || !this.isAgent()) return [];

    const modules = this.modulesSvc.modules();
    const sets = this.permissionSetsSvc.sets();
    const teams = this.teamsSvc.teams();

    // No permission set assigned in any module → no permissions (a Pending agent not yet
    // provisioned, or an Inactive agent whose access was revoked). Return no cards so the
    // Permissions tab falls through to its "No permissions assigned" empty state.
    const hasAnyPermissionSet = Object.values(u.permissionSetByModule).some((id) =>
      sets.some((s) => s.id === id),
    );
    if (!hasAnyPermissionSet) return [];

    return u.modules.map((moduleId) => {
      const mod = modules.find((m) => m.id === moduleId);
      const setId = u.permissionSetByModule[moduleId];
      const set = sets.find((s) => s.id === setId);
      const moduleTeams = teams
        .filter((t) => u.teams.includes(t.id) && t.module === moduleId)
        .map((t) => t.name);

      return {
        id: moduleId,
        name: mod?.name ?? moduleId,
        icon: mod?.icon ?? 'category',
        accent: mod?.accent ?? 'grey',
        permissionSetName: set?.name ?? 'Not assigned',
        teams: moduleTeams,
      };
    });
  });

  // ── Formatting ─────────────────────────────────────────────────────────────────
  formatDate(iso?: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
