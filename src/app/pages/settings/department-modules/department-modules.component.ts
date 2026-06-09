import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface ModuleInfo {
  id: string;
  name: string;
  icon: string;          // Material Symbol name
  accent: 'blue' | 'green' | 'grey' | 'navy' | 'orange' | 'pink' | 'purple' | 'red' | 'teal' | 'yellow'; // icon + surface accent pair ('grey' = neutral tile)
  tagline: string;       // one-line summary of the module
  features: string[];    // what's included — rendered as a checklist
  active: boolean;       // true = owned/active; false = available (requestable)
  pending?: boolean;     // requested and awaiting review — shown in Active under a full-card overlay
}

interface ModuleSection {
  title: string;
  modules: ModuleInfo[];
}

@Component({
  selector: 'app-department-modules',
  imports: [FormsModule],
  templateUrl: './department-modules.component.html',
  styleUrl: './department-modules.component.scss',
  host: { class: 'ds-page-content', role: 'main' }
})
export class DepartmentModulesComponent {
  // All cards live in one reactive list so confirming a request can flip a module to
  // pending — moving it into Active under the "Under review" overlay. Section membership
  // is derived (see `sections`), not stored.
  private readonly modules = signal<ModuleInfo[]>([
    {
      id: 'classic',
      name: 'Classic',
      icon: 'star',
      accent: 'blue',
      tagline: 'Reach families and staff across email, SMS, and voice — announcements, alerts, and everyday updates.',
      features: [
        'Mass messaging across email, SMS, and voice',
        'District-wide announcements and emergency alerts',
        'Family and staff contact management',
        'Reusable message templates and scheduling',
        'Delivery tracking and engagement reports',
      ],
      active: true,
    },
    {
      id: 'it',
      name: 'IT',
      icon: 'computer',
      accent: 'purple',
      tagline: 'Technology service desk — tickets, assets, and support workflows for your IT team.',
      features: [
        'Hardware and software asset inventory',
        'Device provisioning and lifecycle tracking',
        'IT service-desk workflows with SLAs',
        'Network and access request forms',
        'Integration with device-management tools',
      ],
      active: false,
    },
    {
      id: 'hr',
      name: 'HR',
      icon: 'groups',
      accent: 'orange',
      tagline: 'Staff case management — onboarding, requests, and confidential HR workflows.',
      features: [
        'Confidential staff case management',
        'Onboarding and offboarding workflows',
        'Restricted-access HR ticket queues',
        'Benefits, leave, and document requests',
      ],
      active: false,
    },
    {
      id: 'transportation',
      name: 'Transportation',
      icon: 'directions_bus',
      accent: 'yellow',
      tagline: 'Routing, fleet, and bus service requests for your transportation team.',
      features: [
        'Route planning and assignment',
        'Fleet and vehicle maintenance tracking',
        'Bus service and field-trip requests',
        'Driver scheduling and dispatch',
        'Incident and safety reporting',
      ],
      active: true,
    },
    {
      id: 'facilities',
      name: 'Facilities',
      icon: 'apartment',
      accent: 'teal',
      tagline: 'Work orders and maintenance tracking for buildings and grounds.',
      features: [
        'Work order creation and tracking',
        'Preventive maintenance scheduling',
        'Building and grounds asset registry',
        'Vendor and contractor coordination',
      ],
      active: false,
    },
    // Requestable "Custom module" — always stays in Available. Requesting it spawns a
    // named pending copy (see confirmRequest), rather than moving this card. Body copy
    // is filler — to be replaced.
    {
      id: 'custom',
      name: 'Custom module',
      icon: 'settings',
      accent: 'grey',
      tagline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.',
      features: [
        'Lorem ipsum dolor sit amet',
        'Consectetur adipiscing elit',
        'Sed do eiusmod tempor incididunt',
        'Ut labore et dolore magna aliqua',
      ],
      active: false,
    },
    // Pre-existing pending example — a custom module already awaiting review. Sits in
    // Active under the "Under review" overlay. Body copy is filler — to be replaced.
    {
      id: 'pending-custom',
      name: 'Custom module',
      icon: 'settings',
      accent: 'grey',
      tagline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.',
      features: [
        'Lorem ipsum dolor sit amet',
        'Consectetur adipiscing elit',
        'Sed do eiusmod tempor incididunt',
        'Ut labore et dolore magna aliqua',
      ],
      active: false,
      pending: true,
    },
  ]);

  // Active = owned or pending (pending shows the review overlay); Available = the rest.
  // Order within each section follows the list order above.
  readonly sections = computed<ModuleSection[]>(() => {
    const all = this.modules();
    return [
      { title: 'Active modules',    modules: all.filter(m => m.active || m.pending) },
      { title: 'Available modules', modules: all.filter(m => !m.active && !m.pending) },
    ];
  });

  // ── Request flow ───────────────────────────────────────────────────────────
  // The module whose request dialog is open (null = no dialog). The Custom module adds
  // a required name field; every other module is a straight confirmation.
  readonly requestTarget = signal<ModuleInfo | null>(null);
  // Two-way bound to the name field in the Custom module dialog.
  customName = '';
  // Keeps each requested custom module's id unique.
  private pendingSeq = 0;

  get isCustomRequest(): boolean {
    return this.requestTarget()?.id === 'custom';
  }

  openRequest(module: ModuleInfo): void {
    this.customName = '';
    this.requestTarget.set(module);
  }

  closeRequest(): void {
    this.requestTarget.set(null);
  }

  confirmRequest(): void {
    const target = this.requestTarget();
    if (!target) return;

    if (target.id === 'custom') {
      const name = this.customName.trim();
      if (!name) return; // name is required for a custom module
      // Spawn a named pending copy; the requestable Custom card stays in Available.
      const requested: ModuleInfo = {
        ...target,
        id: `pending-custom-${++this.pendingSeq}`,
        name,
        active: false,
        pending: true,
      };
      this.modules.update(list => [...list, requested]);
    } else {
      // Flip the requested module to pending so it moves into Active under the overlay.
      this.modules.update(list =>
        list.map(m => (m.id === target.id ? { ...m, pending: true } : m)),
      );
    }

    this.closeRequest();
  }
}
