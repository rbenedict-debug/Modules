import { Component } from '@angular/core';

interface ModuleInfo {
  id: string;
  name: string;
  icon: string;          // Material Symbol name
  accent: 'blue' | 'green' | 'navy' | 'orange' | 'pink' | 'purple' | 'red' | 'teal' | 'yellow'; // icon + surface accent pair
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
  selector: 'app-modules',
  templateUrl: './modules.component.html',
  styleUrl: './modules.component.scss',
  host: { class: 'ds-page-content', role: 'main' }
})
export class ModulesComponent {
  // Every module is the same kind of card, driven by `active`. The same card handles
  // any combination of active/available (e.g. Communications off, Facilities on).
  readonly modules: ModuleInfo[] = [
    {
      id: 'communications',
      name: 'Communications',
      icon: 'campaign',
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
  ];

  // The request-based "Custom module" card. It isn't an owned or pre-built module,
  // so it lives outside `modules` and is pinned to the front of Available. It renders
  // through the same available-card path (icon tile, "What's included" list, "Learn
  // more"). Body copy is filler — to be replaced.
  private readonly customModule: ModuleInfo = {
    id: 'custom',
    name: 'Custom module',
    icon: 'dashboard_customize',
    accent: 'pink',
    tagline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.',
    features: [
      'Lorem ipsum dolor sit amet',
      'Consectetur adipiscing elit',
      'Sed do eiusmod tempor incididunt',
      'Ut labore et dolore magna aliqua',
    ],
    active: false,
  };

  // A custom module that's been requested and is awaiting approval. It sits in the
  // Active section among the owned modules, set apart by a full-card "Under review"
  // overlay (not a status pill) so the pending state is unmistakable. It's appended
  // explicitly rather than filtered in, since it isn't active yet. Body copy is
  // filler — to be replaced.
  private readonly pendingModule: ModuleInfo = {
    id: 'pending-custom',
    name: 'Custom module',
    icon: 'dashboard_customize',
    accent: 'pink',
    tagline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.',
    features: [
      'Lorem ipsum dolor sit amet',
      'Consectetur adipiscing elit',
      'Sed do eiusmod tempor incididunt',
      'Ut labore et dolore magna aliqua',
    ],
    active: false,
    pending: true,
  };

  // The two on-page sections. Active/available membership is fixed, so this is
  // computed once. The pending request trails the owned modules in Active; the
  // Custom module card always leads Available.
  readonly sections: ModuleSection[] = [
    { title: 'Active modules',    modules: [...this.modules.filter(m => m.active), this.pendingModule] },
    { title: 'Available modules', modules: [this.customModule, ...this.modules.filter(m => !m.active)] },
  ];
}
