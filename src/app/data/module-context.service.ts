import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Capability, Integration, Module, ModuleRole, moduleCapabilities } from './models';
import { ModulesService } from './modules.service';
import { PersonaService } from './persona.service';
import { IntegrationsService } from './integrations.service';

/** A module the active persona can act in, enriched with that persona's role in it. */
export type AccessibleModule = Module & { role: ModuleRole };

/** Every capability area — the visible set in the Global (district-wide) context. */
const ALL_CAPABILITIES: ReadonlySet<Capability> = new Set<Capability>([
  'ticketing', 'analytics', 'workflow', 'assets',
]);

/**
 * Derives the viewing context from the active Persona (PersonaService). Persona is the
 * source of truth: it decides which modules are accessible (and the role in each), whether
 * the top-nav switcher appears, and which nav areas are visible. The public surface
 * (currentModuleId / isGlobal / isAgentRole / can* / select) is unchanged so the feature
 * pages keep working.
 */
@Injectable({ providedIn: 'root' })
export class ModuleContextService {
  private readonly modulesSvc = inject(ModulesService);
  private readonly personaSvc = inject(PersonaService);
  private readonly integrationsSvc = inject(IntegrationsService);

  // null = Global (district-wide) context — only reachable by global-admin personas.
  private readonly _currentModuleId = signal<string | null>(null);
  readonly currentModuleId = this._currentModuleId.asReadonly();

  readonly isGlobalAdmin = computed(() => this.personaSvc.current().isGlobalAdmin);

  /** Modules the active persona can act in, each carrying the persona's role in that module. */
  readonly availableModules = computed<AccessibleModule[]>(() => {
    const all = this.modulesSvc.modules();
    return this.personaSvc.current().moduleAccess
      .map(a => {
        const m = all.find(mod => mod.id === a.moduleId);
        return m ? { ...m, role: a.role } : null;
      })
      .filter((m): m is AccessibleModule => m !== null);
  });

  /** The top-nav switcher only appears when there's more than one context to move between. */
  readonly showSwitcher = computed(
    () => this.isGlobalAdmin() || this.availableModules().length > 1,
  );

  readonly isGlobal = computed(() => this._currentModuleId() === null);
  readonly currentModule = computed<AccessibleModule | null>(
    () => this.availableModules().find(m => m.id === this._currentModuleId()) ?? null,
  );

  /** Agent context = a non-global context whose persona role is Agent. Global admins are never agents. */
  readonly isAgentRole = computed(() => !this.isGlobal() && this.currentModule()?.role === 'Agent');

  /**
   * Capability areas visible in the current context: a specific module → that module's
   * capabilities (from its features); Global context (global admin, no module) → all of them.
   * The side-nav (Assets/Analytics) and the Settings sections gate on these.
   */
  readonly visibleCapabilities = computed<ReadonlySet<Capability>>(() => {
    const mod = this.currentModule();
    return mod ? moduleCapabilities(mod) : ALL_CAPABILITIES;
  });

  readonly hasTicketing = computed(() => this.visibleCapabilities().has('ticketing'));
  readonly hasAnalytics = computed(() => this.visibleCapabilities().has('analytics'));
  readonly hasWorkflow  = computed(() => this.visibleCapabilities().has('workflow'));
  readonly hasAssets    = computed(() => this.visibleCapabilities().has('assets'));

  /**
   * Integrations the current context manages. Global context → all of them (a global admin owns the
   * Integration Hub). Scoped into a module → only the integrations a global admin has granted that
   * department manager access to (assigned in the Marketplace). Empty for an ungranted department.
   */
  readonly managedIntegrations = computed<Integration[]>(() => {
    const id = this._currentModuleId();
    const all = this.integrationsSvc.integrations();
    return id === null ? all : all.filter(i => i.managerModuleIds.includes(id));
  });

  /** Integration Hub is district-level (Global context only), except a department granted manager
   *  access to ≥1 integration sees a scoped Integration Hub too. */
  readonly canSeeIntegrations = computed(() => this.isGlobal() || this.managedIntegrations().length > 0);

  readonly canManageUsers = computed(() => this.isGlobalAdmin() || this.currentModule()?.role === 'Admin');
  readonly canCreateUsers = computed(() => this.isGlobal());
  readonly canEditModuleAssignment = computed(() => this.isGlobal());
  readonly canAdminActions = computed(() => this.isGlobalAdmin() || this.currentModule()?.role === 'Admin');

  constructor() {
    // Reset the active context whenever the persona changes: Global for global admins,
    // otherwise the persona's first accessible module. (Effect reads persona, not
    // currentModuleId, so user picks via select() are not clobbered until the next swap.)
    effect(() => {
      const persona = this.personaSvc.current();
      const first = this.availableModules()[0]?.id ?? null;
      this._currentModuleId.set(persona.isGlobalAdmin ? null : first);
    });
  }

  /** Pick a context. null = Global (global admins only); otherwise must be an accessible module. */
  select(moduleId: string | null): void {
    if (moduleId === null) {
      if (this.isGlobalAdmin()) this._currentModuleId.set(null);
      return;
    }
    if (this.availableModules().some(m => m.id === moduleId)) {
      this._currentModuleId.set(moduleId);
    }
  }
}
