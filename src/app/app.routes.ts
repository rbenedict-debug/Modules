import { Routes } from '@angular/router';
import { TicketsComponent } from './pages/tickets/tickets.component';
import { AssetsComponent } from './pages/assets/assets.component';
import { UsersComponent } from './pages/users/users.component';
import { AnalyticsComponent } from './pages/analytics/analytics.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { ModulesComponent } from './pages/settings/modules/modules.component';

export const routes: Routes = [
  { path: '', redirectTo: 'tickets', pathMatch: 'full' },
  { path: 'tickets', component: TicketsComponent },
  { path: 'assets', component: AssetsComponent },
  { path: 'users', component: UsersComponent },
  { path: 'analytics', component: AnalyticsComponent },
  {
    path: 'settings',
    component: SettingsComponent,
    children: [
      { path: '', redirectTo: 'modules', pathMatch: 'full' },
      { path: 'modules', component: ModulesComponent },
    ],
  },
];
