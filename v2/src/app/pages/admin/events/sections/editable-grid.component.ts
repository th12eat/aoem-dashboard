import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { parsePastedRows } from '@shared/utils/paste-grid';

/** A grid column. `select` renders a dropdown from `options`; else a text cell.
 * `locked` cells are display-only (derived values — rank, server name, tag).
 * `swatch` renders a colour stripe from the row's value (the cell value is a
 * hex colour). `options` may be a static list or a per-row function (the player
 * alliance dropdown differs per server). */
export interface GridColumn {
  key: string;
  label: string;
  type?: 'text' | 'select';
  options?: readonly string[];
  optionsFor?: (row: GridRow) => readonly string[];
  width?: string;
  locked?: boolean;
  swatch?: boolean;
}

/** A row is a flat string map keyed by column key (NumericValue stored raw). */
export type GridRow = Record<string, string>;

/**
 * Reusable tabular editor: add/delete/reorder rows, edit cells inline, and a
 * collapsible "Paste rows" box that ingests tab-separated (spreadsheet) or CSV
 * text into rows mapped to the column order. The parent owns the rows (passed
 * in, emitted on every change). Native inputs — no Material.
 */
@Component({
  selector: 'app-editable-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="eg">
      <table class="eg-table">
        <thead>
          <tr>
            @for (c of columns(); track c.key) {
              <th [style.width]="c.width ?? null">{{ c.label }}</th>
            }
            @if (!fixedRows()) {
              <th class="eg-rowctl"></th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track $index; let i = $index) {
            <tr>
              @for (c of columns(); track c.key) {
                <td>
                  @if (c.swatch) {
                    <span class="eg-swatch" [style.background]="row[c.key] || '#8a90a5'"></span>
                  } @else if (c.locked) {
                    <span class="eg-locked">{{ row[c.key] ?? '' }}</span>
                  } @else if (c.type === 'select') {
                    <select [value]="row[c.key] ?? ''" (change)="setCell(i, c.key, $any($event.target).value)">
                      <option value=""></option>
                      @for (o of optionsFor(c, row); track o) {
                        <option [value]="o">{{ o }}</option>
                      }
                    </select>
                  } @else {
                    <input [value]="row[c.key] ?? ''" (input)="setCell(i, c.key, $any($event.target).value)" />
                  }
                </td>
              }
              @if (!fixedRows()) {
                <td class="eg-rowctl">
                  @if (!hideMove()) {
                    <button type="button" title="Move up" (click)="move(i, -1)" [disabled]="i === 0">↑</button>
                    <button type="button" title="Move down" (click)="move(i, 1)" [disabled]="i === rows().length - 1">↓</button>
                  }
                  <button type="button" class="del" title="Delete row" (click)="removeRow(i)">✕</button>
                </td>
              }
            </tr>
          } @empty {
            <tr><td [attr.colspan]="columns().length + 1" class="eg-empty">No rows yet.</td></tr>
          }
        </tbody>
      </table>

      @if (!fixedRows() && !importOnly()) {
        <div class="eg-actions">
          <button type="button" (click)="addRow()">+ Add row</button>
          <button type="button" (click)="showPaste.set(!showPaste())">{{ showPaste() ? 'Hide paste' : '⇕ Paste rows' }}</button>
        </div>
      }

      @if (showPaste()) {
        <div class="eg-paste">
          <p class="eg-hint">Paste rows copied from a spreadsheet (tab-separated) or CSV. Column order: {{ colOrder() }}.</p>
          <textarea [value]="pasteText()" (input)="pasteText.set($any($event.target).value)" rows="4" placeholder="rank⇥name⇥alliance⇥power⇥merits"></textarea>
          <div class="eg-paste-btns">
            <button type="button" (click)="applyPaste('append')" [disabled]="!pasteText().trim()">Append</button>
            <button type="button" (click)="applyPaste('replace')" [disabled]="!pasteText().trim()">Replace all</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .eg-table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--fs-label);
      }
      .eg-table th,
      .eg-table td {
        border: 1px solid var(--border);
        padding: 2px 4px;
        text-align: left;
      }
      .eg-table th {
        color: var(--text-muted);
        font-size: var(--fs-micro);
        text-transform: uppercase;
      }
      .eg-table input,
      .eg-table select {
        width: 100%;
        background: var(--bg-card2);
        border: 1px solid transparent;
        border-radius: 4px;
        color: var(--text-primary);
        padding: 4px 6px;
        font: inherit;
      }
      .eg-table input:focus,
      .eg-table select:focus {
        border-color: var(--border);
        outline: none;
      }
      .eg-swatch {
        display: inline-block;
        width: 100%;
        min-width: 28px;
        height: 14px;
        border-radius: 3px;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      .eg-locked {
        color: var(--text-secondary);
        padding: 4px 2px;
        display: inline-block;
      }
      .eg-rowctl {
        white-space: nowrap;
        width: 1%;
      }
      .eg-rowctl button {
        background: var(--bg-card2);
        border: 1px solid var(--border);
        border-radius: 4px;
        color: var(--text-secondary);
        padding: 2px 6px;
        cursor: pointer;
      }
      .eg-rowctl button.del {
        color: var(--accent-red);
        border-color: var(--accent-red);
      }
      .eg-rowctl button:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }
      .eg-empty {
        color: var(--text-muted);
        text-align: center;
      }
      .eg-actions {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }
      .eg-actions button {
        background: var(--bg-card2);
        border: 1px solid var(--border);
        border-radius: 6px;
        color: var(--text-secondary);
        padding: 5px 10px;
        font-weight: 700;
        cursor: pointer;
      }
      .eg-paste {
        margin-top: 8px;
      }
      .eg-hint {
        color: var(--text-muted);
        font-size: var(--fs-sub);
        margin: 0 0 4px;
      }
      .eg-paste textarea {
        width: 100%;
        background: var(--bg-card2);
        border: 1px solid var(--border);
        border-radius: 6px;
        color: var(--text-primary);
        padding: 6px 8px;
        font: var(--fs-label) / 1.4 var(--font-mono, monospace);
      }
      .eg-paste-btns {
        display: flex;
        gap: 8px;
        margin-top: 4px;
      }
      .eg-paste-btns button {
        background: var(--bg-card2);
        border: 1px solid var(--border);
        border-radius: 6px;
        color: var(--text-secondary);
        padding: 4px 10px;
        cursor: pointer;
      }
    `,
  ],
})
export class EditableGridComponent {
  readonly columns = input.required<readonly GridColumn[]>();
  readonly rows = input.required<GridRow[]>();
  readonly rowsChange = output<GridRow[]>();
  /** When set, the grid is a FIXED N-row table: no add/delete/move controls. */
  readonly fixedRows = input<number | null>(null);
  /** Hide the up/down reorder buttons (non-ranking grids). */
  readonly hideMove = input(false);
  /** No inline paste box (import is handled once at the parent/tab level). */
  readonly importOnly = input(false);

  protected optionsFor(c: GridColumn, row: GridRow): readonly string[] {
    return c.optionsFor ? c.optionsFor(row) : (c.options ?? []);
  }

  protected readonly showPaste = signal(false);
  protected readonly pasteText = signal('');
  protected readonly colOrder = computed(() => this.columns().map(c => c.key).join(', '));

  private emit(next: GridRow[]): void {
    this.rowsChange.emit(next);
  }

  protected setCell(i: number, key: string, value: string): void {
    const next = this.rows().map((r, idx) => (idx === i ? { ...r, [key]: value } : r));
    this.emit(next);
  }
  protected addRow(): void {
    const blank: GridRow = {};
    for (const c of this.columns()) blank[c.key] = '';
    this.emit([...this.rows(), blank]);
  }
  protected removeRow(i: number): void {
    this.emit(this.rows().filter((_, idx) => idx !== i));
  }
  protected move(i: number, dir: -1 | 1): void {
    const next = [...this.rows()];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    this.emit(next);
  }
  protected applyPaste(mode: 'append' | 'replace'): void {
    const parsed = parsePastedRows(
      this.pasteText(),
      this.columns().map(c => c.key),
    );
    if (!parsed.length) return;
    this.emit(mode === 'replace' ? parsed : [...this.rows(), ...parsed]);
    this.pasteText.set('');
    this.showPaste.set(false);
  }
}
