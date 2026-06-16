import { Injectable, signal } from '@angular/core';
import { Module } from './models';
@Injectable({ providedIn: 'root' })
export class ModulesService {
  readonly modules = signal<Module[]>([
    { id: 'classic', name: 'Classic', icon: 'star', accent: 'blue', role: 'Admin', ticketCount: 24, active: true },
    { id: 'transportation', name: 'Transportation', icon: 'directions_bus', accent: 'yellow', role: 'Admin', ticketCount: 8, active: true },
    { id: 'it', name: 'IT', icon: 'computer', accent: 'purple', role: 'Agent', ticketCount: 12, active: false },
    { id: 'hr', name: 'HR', icon: 'groups', accent: 'orange', role: 'Agent', ticketCount: 3, active: false },
    { id: 'facilities', name: 'Facilities', icon: 'apartment', accent: 'teal', role: 'Agent', ticketCount: 5, active: false },
  ]);
}
