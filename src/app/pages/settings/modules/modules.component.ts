import { Component } from '@angular/core';

interface ModuleInfo {
  id: string;
  name: string;
  icon: string;          // Material Symbol name
  accent: 'blue' | 'green' | 'navy' | 'orange' | 'pink' | 'purple' | 'red' | 'teal' | 'yellow'; // icon + surface accent pair
  tagline: string;       // one-line summary of the module
  features: string[];    // what's included — rendered as a checklist
  active: boolean;       // true = owned/active, false = available
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

  // The two on-page sections. Active/available membership is fixed, so this is
  // computed once.
  readonly sections: ModuleSection[] = [
    { title: 'Active modules',    modules: this.modules.filter(m => m.active) },
    { title: 'Available modules', modules: this.modules.filter(m => !m.active) },
  ];
}
