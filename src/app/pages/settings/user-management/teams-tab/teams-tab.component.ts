import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-teams-tab',
  standalone: true,
  imports: [],
  templateUrl: './teams-tab.component.html',
  styleUrl: './teams-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamsTabComponent {}
