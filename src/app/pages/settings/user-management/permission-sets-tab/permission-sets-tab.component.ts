import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-permission-sets-tab',
  standalone: true,
  imports: [],
  templateUrl: './permission-sets-tab.component.html',
  styleUrl: './permission-sets-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionSetsTabComponent {}
