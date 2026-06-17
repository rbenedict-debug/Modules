import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MessagingService } from '../../data/messaging.service';

/**
 * Renders the app's single top-center snackbar (success or error-with-retry) from
 * MessagingService. Mounted once in the shell. Design mode: the DS snackbar has no
 * error variant, so failures reuse the text-action shell plus a leading error icon.
 */
@Component({
  selector: 'app-snackbar-host',
  standalone: true,
  imports: [],
  templateUrl: './snackbar-host.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SnackbarHostComponent {
  readonly msg = inject(MessagingService);
}
