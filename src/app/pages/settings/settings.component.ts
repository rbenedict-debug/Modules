import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-settings',
  imports: [RouterOutlet],
  templateUrl: './settings.component.html',
  // Transparent shell — child settings pages (e.g. DepartmentModulesComponent) carry their own
  // ds-page-content; display:contents keeps this wrapper out of the layout.
  host: { style: 'display: contents' }
})
export class SettingsComponent {}
