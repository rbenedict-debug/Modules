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
    // Example custom, client-named module. Custom modules use the shared CUSTOM_MODULE_DEFAULTS
    // treatment (settings icon, grey tile, ticketing-only copy); only the name is client-chosen.
    {
      id: 'music', name: 'Music', ticketCount: 7, active: true, ...CUSTOM_MODULE_DEFAULTS,
    },
  ]);
}
