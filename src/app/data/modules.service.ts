import { Injectable, signal } from '@angular/core';
import { Module } from './models';

@Injectable({ providedIn: 'root' })
export class ModulesService {
  // The district's department modules. Role per module is NOT here — it belongs to the
  // active Persona (see PersonaService / ModuleContextService.availableModules).
  readonly modules = signal<Module[]>([
    { id: 'classic', name: 'Classic', icon: 'star', accent: 'blue', ticketCount: 24, active: true },
    { id: 'transportation', name: 'Transportation', icon: 'directions_bus', accent: 'yellow', ticketCount: 8, active: true },
    { id: 'it', name: 'IT', icon: 'computer', accent: 'purple', ticketCount: 12, active: false },
    { id: 'hr', name: 'HR', icon: 'groups', accent: 'orange', ticketCount: 3, active: false },
    { id: 'facilities', name: 'Facilities', icon: 'apartment', accent: 'teal', ticketCount: 5, active: false },
  ]);
}
