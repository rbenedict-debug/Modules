import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-user-profile-drawer',
  standalone: true,
  imports: [],
  templateUrl: './user-profile-drawer.component.html',
  styleUrl: './user-profile-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileDrawerComponent {
  /** Id of the user to show; null means the drawer is closed. */
  @Input() userId: string | null = null;
  /** Emits when the drawer requests to close. */
  @Output() close = new EventEmitter<void>();
}
