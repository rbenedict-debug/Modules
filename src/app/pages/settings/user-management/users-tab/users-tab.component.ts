import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-users-tab',
  standalone: true,
  imports: [],
  templateUrl: './users-tab.component.html',
  styleUrl: './users-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersTabComponent {
  /** Emits the id of the user whose profile should open. */
  @Output() viewProfile = new EventEmitter<string>();
}
