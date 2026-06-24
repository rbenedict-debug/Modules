import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

@Component({
  selector: 'app-authentication-tab',
  standalone: true,
  imports: [],
  templateUrl: './authentication-tab.component.html',
  styleUrl: './authentication-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Transparent wrapper: the parent Agent Management page owns the ds-page-content host,
  // the page <h1>, and the tab bar. This tab supplies only its content card.
  host: { style: 'display: contents' },
})
export class AuthenticationTabComponent {
  /** Demo-only 2FA state — drives the toggle label. Not persisted (design mode). */
  readonly enabled = signal(false);

  /** Demo-only delivery channel for the verification code, shown only when 2FA is enabled. Not persisted. */
  readonly method = signal<'email' | 'sms' | 'both'>('email');

  toggle(): void {
    this.enabled.update(v => !v);
  }

  setMethod(method: 'email' | 'sms' | 'both'): void {
    this.method.set(method);
  }
}
