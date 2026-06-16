import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Module, ModuleRole } from './models';
import { ModulesService } from './modules.service';
import { PersonaService } from './persona.service';

/** A module the active persona can act in, enriched with that persona's role in it. */
export type AccessibleModule = Module & { role: ModuleRole };

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
