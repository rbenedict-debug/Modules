import { Component } from '@angular/core';

/**
 * Blank settings placeholder. Shown in the settings content area for any context that can't reach
 * the Global admin pages (Department Modules / User Management) — i.e. whenever the Global switcher
 * isn't selected. The module-context settings sections (Tickets/Workflows/…) have no pages of their
 * own yet, so this keeps a Global-only page from lingering in the pane after you scope into a module.
 */
@Component({
  selector: 'app-settings-blank',
  template: `
    <div class="ds-page-content__heading">
      <h1 class="ds-page-content__title ds-sr-only">Settings</h1>
    </div>
    <div class="ds-page-content__main">
      <!-- TODO eng: intentionally blank — module-context settings pages land here once built -->
    </div>
  `,
  host: { class: 'ds-page-content', role: 'main' },
})
export class SettingsBlankComponent {}
