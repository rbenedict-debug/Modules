import { Routes } from '@angular/router';
import { TicketsComponent } from './pages/tickets/tickets.component';
import { AssetsComponent } from './pages/assets/assets.component';
import { UsersComponent } from './pages/users/users.component';
import { AnalyticsComponent } from './pages/analytics/analytics.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { DepartmentModulesComponent } from './pages/settings/department-modules/department-modules.component';
import { UserManagementComponent } from './pages/settings/user-management/user-management.component';
import { SettingsBlankComponent } from './pages/settings/blank/blank.component';

export const routes: Routes = [
  { path: '', redirectTo: 'settings/department-modules', pathMatch: 'full' },
  { path: 'tickets', component: TicketsComponent },
  { path: 'assets', component: AssetsComponent },
  { path: 'users', component: UsersComponent },
  { path: 'analytics', component: AnalyticsComponent },
  {
    path: 'settings',
    component: SettingsComponent,
    children: [
      { path: '', redirectTo: 'department-modules', pathMatch: 'full' },
      { path: 'department-modules', component: DepartmentModulesComponent },
      { path: 'user-management', component: UserManagementComponent },
      { path: 'blank', component: SettingsBlankComponent },
    ],
  },
];
