import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewEncapsulation,
  effect,
  inject,
  input,
} from '@angular/core';
import { PermissionSetsService } from '../../../../data/permission-sets.service';
import { ChromeService } from '../../../../data/chrome.service';
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
  readonly state = inject(PermissionEditorStateService);

  readonly actionsSections = this.setsSvc.actionsSections;
  readonly settingsSections = this.setsSvc.settingsSections;

  /** Active tab — owned by the parent now (the tab bar moved to the page heading). */
  readonly activeTab = input<EditorTab>('details');

  constructor() {
    // Dock the shell's bottom save bar only while there are unsaved changes (state.dirty() is
    // false for read-only sets and after save/discard). The shell renders it outside the page;
    // Save persists and stays here, Cancel reverts the edits — neither leaves the editor.
    effect(() => {
      this.chrome.saveBar.set(
        this.state.dirty()
          ? { onCancel: () => this.state.discard(), onSave: () => this.state.save() }
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
      type: 'Custom',
      isLocked: false,
      capabilities: { ...src.capabilities },
    });
    const dup = this.setsSvc.sets()[this.setsSvc.sets().length - 1];
    if (dup) this.openSet.emit(dup.id);
  }
}
