import { Injectable, inject } from '@angular/core';
import { PersonaScenario } from './models';
import { PersonaService } from './persona.service';
import { UsersService } from './users.service';
import { TeamsService } from './teams.service';
import { PermissionSetsService } from './permission-sets.service';
import { ModulesService } from './modules.service';
import { CustomFieldsService } from './custom-fields.service';
import { FRESH_IT_USERS } from './fresh-setup.data';

/** The scenario whose seed data is currently loaded ('default' = the standard fully-configured district). */
type LoadedScenario = PersonaScenario | 'default';

/**
 * Coordinates the demo "world state" behind the active persona. Most personas share the default,
 * fully-configured district; a persona that carries a `scenario` (see PersonaScenario) loads a
 * different seed across the data services.
 *
 * The swap is done synchronously inside selectPersona() — NOT in an effect — on purpose: the Agent
 * Management tabs (Agents / Teams / Permission Sets) host table-init.js, which detaches change
 * detection and only re-reads its rows on a keyed re-create. Those tabs re-mount on a persona swap
 * (see ModuleContextService.contextKey); if the data were swapped in an effect that races that
 * re-mount, a tab could re-create reading stale rows and stick. Swapping before Angular renders
 * guarantees the new world is in place by the time the tabs re-read it.
 */
@Injectable({ providedIn: 'root' })
export class ScenarioService {
  private readonly personaSvc = inject(PersonaService);
  private readonly usersSvc = inject(UsersService);
  private readonly teamsSvc = inject(TeamsService);
  private readonly setsSvc = inject(PermissionSetsService);
  private readonly modulesSvc = inject(ModulesService);
  private readonly customFieldsSvc = inject(CustomFieldsService);

  // Starts 'default' to match the seeded services + the default persona, so boot needs no swap.
  private loaded: LoadedScenario = 'default';

  /** Switch persona and synchronously load that persona's world (a no-op swap if the scenario is
   *  unchanged, e.g. moving between two default-world personas). */
  selectPersona(id: string): void {
    this.personaSvc.select(id);
    this.apply(this.personaSvc.current().scenario ?? 'default');
  }

  private apply(scenario: LoadedScenario): void {
    if (scenario === this.loaded) return;
    this.loaded = scenario;
    if (scenario === 'fresh-it-setup') {
      this.usersSvc.load(FRESH_IT_USERS);
      this.teamsSvc.load([]);
      this.setsSvc.load(this.setsSvc.systemSets());
      this.modulesSvc.load(this.modulesSvc.freshItSetup());
      this.customFieldsSvc.load([]);
    } else {
      this.usersSvc.resetToDefault();
      this.teamsSvc.resetToDefault();
      this.setsSvc.resetToDefault();
      this.modulesSvc.resetToDefault();
      this.customFieldsSvc.resetToDefault();
    }
  }
}
