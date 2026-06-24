import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { PSET_ASSET_TYPES, PSET_GRADES, PSET_USER_TYPES } from '../../../../data/permission-catalog';
import { FilterKey, PermissionEditorStateService } from './permission-editor-state.service';

interface FilterConfig {
  key: FilterKey;
  label: string;
  placeholder: string;
  /** Phrase used in the helper text: "User can only see assets {verb}: …". */
  verb: string;
  options: string[];
}

/**
 * Data Visibility tab: Tickets + Assets record scopes, plus the Assets filter builder
 * (Asset Type / Assigned User Type / Grade — each a reactive multiselect with an Exclude toggle).
 * Reads/writes via PermissionEditorStateService.
 */
@Component({
  selector: 'app-pset-data-visibility-tab',
  standalone: true,
  imports: [],
  templateUrl: './pset-data-visibility-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'psets-editor__dv' },
})
export class PsetDataVisibilityTabComponent {
  readonly state = inject(PermissionEditorStateService);

  readonly filterConfigs: FilterConfig[] = [
    { key: 'assetType', label: 'Asset Type', placeholder: 'Select asset types…', verb: 'of type', options: PSET_ASSET_TYPES },
    { key: 'userType', label: 'Assigned User Type', placeholder: 'Select user types…', verb: 'assigned to', options: PSET_USER_TYPES },
    { key: 'grade', label: 'Grade', placeholder: 'Select grades…', verb: 'in grade', options: PSET_GRADES },
  ];

  // Which filter's dropdown is open (one at a time).
  readonly openFilter = signal<FilterKey | null>(null);
  toggleOpen(key: FilterKey): void {
    if (this.state.readOnly()) return;
    this.openFilter.update(o => (o === key ? null : key));
  }

  selected(key: FilterKey): string[] {
    return this.state.filters()[key].values;
  }
  isExclude(key: FilterKey): boolean {
    return this.state.filters()[key].exclude;
  }
  fieldText(key: FilterKey, placeholder: string): string {
    const v = this.selected(key);
    return v.length === 0 ? placeholder : v.length === 1 ? v[0] : `${v.length} selected`;
  }
  helper(cfg: FilterConfig): string {
    const v = this.selected(cfg.key);
    if (v.length === 0) return 'No filter applied';
    const verb = this.isExclude(cfg.key) ? 'cannot see' : 'can only see';
    return `User ${verb} assets ${cfg.verb}: ${v.join(', ')}`;
  }
  helperClass(key: FilterKey): string {
    if (this.selected(key).length === 0) return 'none';
    return this.isExclude(key) ? 'exclude' : 'include';
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (this.openFilter() && !(e.target as HTMLElement).closest('.psets-editor__filter')) {
      this.openFilter.set(null);
    }
  }
}
