import { Injectable, computed, inject, signal } from '@angular/core';
import { ModulesService } from './modules.service';
@Injectable({ providedIn: 'root' })
export class ModuleContextService {
  private readonly modulesSvc = inject(ModulesService);
  private readonly _currentModuleId = signal<string | null>(null);
  readonly currentModuleId = this._currentModuleId.asReadonly();
  readonly isGlobal = computed(() => this._currentModuleId() === null);
  readonly currentModule = computed(() => this.modulesSvc.modules().find(m => m.id === this._currentModuleId()) ?? null);
  readonly isAgentRole = computed(() => !this.isGlobal() && this.currentModule()?.role === 'Agent');
  readonly canManageUsers = computed(() => this.isGlobal() || this.currentModule()?.role === 'Admin');
  readonly canCreateUsers = computed(() => this.isGlobal());
  readonly canEditModuleAssignment = computed(() => this.isGlobal());
  readonly canAdminActions = computed(() => this.isGlobal() || this.currentModule()?.role === 'Admin');
  select(moduleId: string | null): void { this._currentModuleId.set(moduleId); }
}
