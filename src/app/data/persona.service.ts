import { Injectable, computed, signal } from '@angular/core';
import { Persona } from './models';

/**
 * Demo personas for the ⌘K/Ctrl+K persona swapper. The active persona is the source of
 * truth for the whole shell (see ModuleContextService, which derives module access, switcher
 * visibility, and nav gating from it). Names align with the seeded user directory.
 */
@Injectable({ providedIn: 'root' })
export class PersonaService {
  readonly personas = signal<Persona[]>([
    {
      id: 'scarlett', name: 'Scarlett Bailey', title: 'Deputy Superintendent', isGlobalAdmin: true,
      moduleAccess: [
        { moduleId: 'classic', role: 'Admin' },
        { moduleId: 'transportation', role: 'Admin' },
        { moduleId: 'it', role: 'Admin' },
        { moduleId: 'hr', role: 'Admin' },
        { moduleId: 'facilities', role: 'Admin' },
        { moduleId: 'music', role: 'Admin' },
      ],
    },
    {
      id: 'marcus', name: 'Marcus Lee', title: 'Transportation Manager', isGlobalAdmin: false,
      moduleAccess: [
        { moduleId: 'transportation', role: 'Admin' },
        { moduleId: 'classic', role: 'Admin' },
      ],
    },
    {
      id: 'linda', name: 'Linda Okafor', title: 'HR Director', isGlobalAdmin: false,
      moduleAccess: [{ moduleId: 'hr', role: 'Admin' }],
    },
    {
      id: 'james', name: 'James Carter', title: 'Help Desk Technician', isGlobalAdmin: false,
      moduleAccess: [{ moduleId: 'it', role: 'Agent' }],
    },
    {
      id: 'hannah', name: 'Hannah Cohen', title: 'Facilities Manager', isGlobalAdmin: false,
      moduleAccess: [{ moduleId: 'facilities', role: 'Agent' }],
    },
  ]);

  // Default to the Global Admin so the app opens in the full-access view.
  private readonly _currentId = signal<string>('scarlett');

  readonly current = computed<Persona>(
    () => this.personas().find(p => p.id === this._currentId()) ?? this.personas()[0],
  );

  select(id: string): void {
    if (this.personas().some(p => p.id === id)) this._currentId.set(id);
  }
}
