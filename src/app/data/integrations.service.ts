import { Injectable, signal } from '@angular/core';
import { Integration } from './models';

/**
 * Marketplace catalog — OWNED BY A SEPARATE TEAM; mocked here only to demonstrate the *access*
 * behavior. `managerModuleIds` is the grant a global admin makes in the Marketplace ("this
 * integration may be managed by Department X"); a granted department then sees a scoped Integration
 * Hub (see ModuleContextService.canSeeIntegrations / managedIntegrations). Empty = global-admin-only.
 *
 * Demo grant: HR is a manager of DocuSign + BambooHR, so Linda (HR admin) sees the scoped hub while
 * other department admins don't. The Marketplace assignment screen itself is the other team's to build.
 */
@Injectable({ providedIn: 'root' })
export class IntegrationsService {
  readonly integrations = signal<Integration[]>([
    { id: 'google-workspace', name: 'Google Workspace', managerModuleIds: [] },
    { id: 'clever',           name: 'Clever',           managerModuleIds: [] },
    { id: 'docusign',         name: 'DocuSign',         managerModuleIds: ['hr'] },
    { id: 'bamboohr',         name: 'BambooHR',         managerModuleIds: ['hr'] },
  ]);
}
