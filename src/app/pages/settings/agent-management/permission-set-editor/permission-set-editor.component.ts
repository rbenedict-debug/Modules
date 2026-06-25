import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { PermissionSetsService } from '../../../../data/permission-sets.service';
import { globalTierSections } from '../../../../data/permission-catalog';
import { ChromeService } from '../../../../data/chrome.service';
import { MessagingService } from '../../../../data/messaging.service';
import { PermissionEditorStateService } from './permission-editor-state.service';
import { PsetMatrixTabComponent } from './pset-matrix-tab.component';
import { PsetDataVisibilityTabComponent } from './pset-data-visibility-tab.component';
import { PsetDetailsTabComponent } from './pset-details-tab.component';

export type EditorTab = 'details' | 'data-visibility' | 'actions' | 'settings';

/**
 * Permission-set editor shell — rendered full-area by the Agent Management page when its
 * editingSetId is set. Owns the header (Back / name / System badge / Save / Duplicate), the
 * 4-tab bar (Details / Data Visibility / Actions / Settings), and the read-only banner; the
 * tabs read/write the shared PermissionEditorStateService (provided here, per editor instance).
 * ViewEncapsulation.None so its stylesheet styles the tab sub-components too.
 */
@Component({
  selector: 'app-permission-set-editor',
  standalone: true,
  imports: [PsetMatrixTabComponent, PsetDataVisibilityTabComponent, PsetDetailsTabComponent],
  templateUrl: './permission-set-editor.component.html',
  styleUrl: './permission-set-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [PermissionEditorStateService],
  host: { class: 'ds-page-content__main', style: 'display: flex; flex-direction: column;' },
})
export class PermissionSetEditorComponent implements OnInit, OnDestroy {
  /** The set to edit. Re-loads the working state whenever it changes (e.g. after Duplicate). */
  @Input({ required: true })
  set setId(value: string) {
    this._setId = value;
    this.reload();
  }
  get setId(): string {
    return this._setId;
  }
  private _setId = '';

  /** Emitted with a set id to open (Duplicate hands the parent the new set). */
  @Output() openSet = new EventEmitter<string>();

  private readonly setsSvc = inject(PermissionSetsService);
  private readonly chrome = inject(ChromeService);
  private readonly msg = inject(MessagingService);
  readonly state = inject(PermissionEditorStateService);

  readonly actionsSections = this.setsSvc.actionsSections;
  /** A global set can't hold department-scoped config, so its Settings tab shows only the Global
   *  section (minus its one department-tier row, Department Locations). Department sets get the full
   *  catalog. The Actions tab is hidden entirely for global sets (filtered in agent-management). */
  readonly settingsSections = computed(() =>
    this.state.isGlobalOnly()
      ? globalTierSections(this.setsSvc.settingsSections)
      : this.setsSvc.settingsSections,
  );

  /** Active tab — owned by the parent now (the tab bar moved to the page heading). */
  readonly activeTab = input<EditorTab>('details');

  constructor() {
    // Dock the shell's bottom save bar only while there are unsaved changes (state.dirty() clears
    // after save/discard). The shell renders it outside the page; Save Changes persists and stays
    // here, Discard reverts the edits — neither leaves the editor.
    effect(() => {
      this.chrome.saveBar.set(
        this.state.dirty()
          ? { onCancel: () => this.discardChanges(), onSave: () => this.saveChanges() }
          : null,
      );
    });
  }

  ngOnInit(): void {
    // Collapse the section subnav while this full-area editor is on screen.
    this.chrome.setEditorOpen(true);
  }
  ngOnDestroy(): void {
    this.chrome.setEditorOpen(false);
    this.chrome.hideSaveBar();
  }

  // ── Save bar actions (the project's success/error snackbar pattern) ──────────────
  /** Save Changes: validate, persist, toast success. A blank name (editable sets) → error toast. */
  private saveChanges(): void {
    if (!this.state.readOnly() && !this.state.name().trim()) {
      this.msg.error('Enter a permission set name before saving.');
      return;
    }
    this.state.save();
    this.msg.success('Permission set saved.');
  }
  /** Discard: revert the working state to the last-saved set (the save bar clears via `dirty`). */
  private discardChanges(): void {
    this.state.discard();
  }

  private reload(): void {
    const set = this.setsSvc.sets().find(s => s.id === this._setId);
    if (!set) return;
    this.state.init(set);
  }

  /** Duplicate a (system) set into an editable Custom copy, then open it. */
  duplicate(): void {
    const src = this.setsSvc.sets().find(s => s.id === this._setId);
    if (!src) return;
    this.setsSvc.add({
      name: `${src.name} (copy)`,
      description: src.description,
      moduleId: src.moduleId,
      isGlobalOnly: src.isGlobalOnly,
      type: 'Custom',
      isLocked: false,
      capabilities: { ...src.capabilities },
    });
    const dup = this.setsSvc.sets()[this.setsSvc.sets().length - 1];
    if (dup) this.openSet.emit(dup.id);
  }
}
