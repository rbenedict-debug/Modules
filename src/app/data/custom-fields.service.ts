import { Injectable, signal } from '@angular/core';

/** A district-defined custom field beyond the 12 standard agent fields. */
export interface CustomFieldDef {
  key: string;
  label: string;
}

/**
 * The single source for the district's custom-field definitions. The agent profile renders one row
 * per def (with this agent's value from User.customFields, or "—" when unset). A brand-new account
 * hasn't defined any yet, so ScenarioService empties this in the fresh-it-setup world and the
 * profile then shows no Custom Fields section at all.
 *
 * TODO eng: load these definitions from the district's custom-field schema (an integration can
 * toggle individual fields on/off) instead of this static seed.
 */
@Injectable({ providedIn: 'root' })
export class CustomFieldsService {
  readonly defs = signal<CustomFieldDef[]>([
    { key: 'room', label: 'Office / Room' },
    { key: 'shift', label: 'Shift' },
    { key: 'badge', label: 'Badge ID' },
  ]);

  /** The default seed, captured so ScenarioService can restore it when leaving a demo scenario. */
  private readonly defaultDefs = this.defs();

  /** Replace the definitions (ScenarioService uses this on a scenario swap — e.g. [] for a fresh account). */
  load(list: CustomFieldDef[]): void {
    this.defs.set(list);
  }

  /** Restore the default definitions. */
  resetToDefault(): void {
    this.defs.set(this.defaultDefs);
  }
}
