import { Injectable, signal } from '@angular/core';
import { Module, CUSTOM_MODULE_DEFAULTS } from './models';

@Injectable({ providedIn: 'root' })
export class ModulesService {
  // Single source of truth for the district's department modules — identity (name/icon/accent),
  // catalog copy (tagline/features), ticket counts, and active state. The switcher, command
  // palette, and the Department Modules settings page all read from here, so a module is defined
  // exactly once. Role per module is NOT here — it belongs to the active Persona (see
  // PersonaService / ModuleContextService.availableModules).
  readonly modules = signal<Module[]>([
    {
      id: 'classic', name: 'Classic', icon: 'star', accent: 'blue', ticketCount: 24, active: true,
      tagline: 'The Onflo service desk your district already runs on, and the foundation every other module is built from.',
      features: ['Service desk ticketing', 'Dashboard analytics', 'Workflow automation and routing'],
    },
    {
      id: 'transportation', name: 'Transportation', icon: 'directions_bus', accent: 'yellow', ticketCount: 8, active: false, comingSoon: true,
      tagline: 'A space built around how your transportation team works, ready to go with the data you already have.',
      features: ['Service desk ticketing', 'Dashboard analytics', 'Workflow automation and routing'],
    },
    {
      id: 'it', name: 'IT', icon: 'computer', accent: 'purple', ticketCount: 12, active: false,
      tagline: "Your IT team gets a service desk of its own, running on the setup you've already done.",
      features: ['Service desk ticketing', 'Dashboard analytics', 'Workflow automation and routing', 'Asset management'],
    },
    {
      id: 'hr', name: 'HR', icon: 'groups', accent: 'orange', ticketCount: 3, active: false, comingSoon: true,
      tagline: 'A private space for HR, with restricted queues for cases that need to stay confidential.',
      features: ['Service desk ticketing', 'Dashboard analytics', 'Workflow automation and routing'],
    },
    {
      id: 'facilities', name: 'Facilities', icon: 'apartment', accent: 'teal', ticketCount: 5, active: false, comingSoon: true,
      tagline: 'A service desk for your facilities team, with asset and maintenance tracking built in.',
      features: ['Service desk ticketing', 'Dashboard analytics', 'Workflow automation and routing', 'Asset management'],
    },
    // Example custom, client-named module. Custom modules share CUSTOM_MODULE_DEFAULTS' copy
    // (ticketing + assets) but choose their own name, icon, and color — here a music note on a
    // magenta tile (one of the 6 K12 colors), showing how a request renders on the card + switcher.
    {
      id: 'music', name: 'Music', ticketCount: 7, active: true, ...CUSTOM_MODULE_DEFAULTS,
      icon: 'music_note', color: 'magenta',
    },
  ]);

  /** The default catalog, captured so ScenarioService can restore it when leaving a demo scenario. */
  private readonly defaultModules = this.modules();

  /** Replace the catalog (ScenarioService uses this on a scenario swap). */
  load(list: Module[]): void {
    this.modules.set(list);
  }

  /** Restore the default catalog. */
  resetToDefault(): void {
    this.modules.set(this.defaultModules);
  }

  /** A brand-new account's catalog: only IT enabled, every prebuilt module still available to add,
   *  and no custom modules created yet (drops the example custom 'Music' module). */
  freshItSetup(): Module[] {
    return this.defaultModules
      .filter((m) => m.id !== 'music')
      .map((m) => ({ ...m, active: m.id === 'it' }));
  }
}
