import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { MapNodeGeo, MapNodeType, ZoneTransition } from '@shared/models/map.model';

const TYPES: MapNodeType[] = ['gate', 'city', 'altar', 'stronghold', 'tower', 'aaru', 'anchor'];
const TRANSITIONS: ZoneTransition[] = ['Z1->Z2', 'Z2<->Z2', 'Z2->Z3', 'Z3->Z4'];

/**
 * Geometry-mode inspector: edit every field of the selected node and delete it.
 * Emits a patched copy on each change (the parent owns the geometry signal).
 * Native inputs (Material isn't bootstrapped in v2 yet).
 */
@Component({
  selector: 'app-node-inspector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (node(); as n) {
      <div class="ni">
        <label class="ni-row"><span>ID</span>
          <input [value]="n.id" (change)="patch('id', val($event))" />
        </label>
        <label class="ni-row"><span>Type</span>
          <select [value]="n.type" (change)="patch('type', val($event))">
            @for (t of types; track t) {
              <option [value]="t">{{ t }}</option>
            }
          </select>
        </label>
        <label class="ni-row"><span>Subtype</span>
          <input [value]="n.subtype ?? ''" (change)="patch('subtype', val($event))" placeholder="e.g. Intermediate Energy City" />
        </label>
        <label class="ni-row"><span>Label</span>
          <input [value]="n.label" (change)="patch('label', val($event))" />
        </label>
        <div class="ni-row2">
          <label><span>X</span><input type="number" step="0.1" [value]="n.x" (change)="patchNum('x', $event)" /></label>
          <label><span>Y</span><input type="number" step="0.1" [value]="n.y" (change)="patchNum('y', $event)" /></label>
        </div>
        @if (n.type === 'gate') {
          <label class="ni-row"><span>Transition</span>
            <select [value]="n.transition ?? ''" (change)="patch('transition', val($event))">
              <option value="">—</option>
              @for (t of transitions; track t) {
                <option [value]="t">{{ t }}</option>
              }
            </select>
          </label>
        }
        <!-- Buff (energy cities etc.) -->
        <fieldset class="ni-fs">
          <legend>Buff</legend>
          <div class="ni-row2">
            <label><span>Key</span><input [value]="n.buff?.key ?? ''" (change)="patchBuff('key', val($event))" placeholder="attack" /></label>
            <label><span>Label</span><input [value]="n.buff?.label ?? ''" (change)="patchBuff('label', val($event))" placeholder="Attack" /></label>
          </div>
          <label class="ni-row"><span>Magnitude</span>
            <input [value]="n.buff?.magnitude ?? ''" (change)="patchBuff('magnitude', val($event))" placeholder="+10%" />
          </label>
        </fieldset>
        <!-- Non-buff effect -->
        <label class="ni-row"><span>Effect</span>
          <input [value]="n.effect?.label ?? ''" (change)="patchEffect(val($event))" placeholder="e.g. +1 Storm Machine" />
        </label>
        <div class="ni-row2">
          <label><span>Energy/hr</span><input type="number" step="1000" [value]="n.energyPerHour ?? 0" (change)="patchNum('energyPerHour', $event)" /></label>
          <label><span>Active day</span><input type="number" [value]="n.activeDayOffset ?? 0" (change)="patchNum('activeDayOffset', $event)" /></label>
        </div>
        <label class="ni-check"><input type="checkbox" [checked]="n.seed === true" (change)="patchSeed($event)" /> Seeds connectivity (stronghold)</label>
        <button type="button" class="ni-del" (click)="askDelete()">Delete node</button>
      </div>
    } @else {
      <p class="ni-hint">Click a node to edit it, or enable “Place node” and click the map to add one. Drag any node or crest to reposition.</p>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .ni {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .ni-row,
      .ni-row2 > label {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .ni-row2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .ni span {
        font-size: var(--fs-micro);
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      input,
      select {
        background: var(--bg-card2);
        border: 1px solid var(--border);
        border-radius: 5px;
        color: var(--text-primary);
        padding: 4px 6px;
        font: inherit;
        font-size: var(--fs-label);
      }
      .ni-fs {
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 6px 8px;
        margin: 2px 0;
      }
      .ni-fs legend {
        font-size: var(--fs-micro);
        color: var(--text-muted);
        padding: 0 4px;
      }
      .ni-check {
        flex-direction: row;
        align-items: center;
        gap: 6px;
        text-transform: none;
        color: var(--text-secondary);
        font-size: var(--fs-label);
      }
      .ni-del {
        margin-top: 6px;
        background: rgba(196, 61, 61, 0.14);
        color: var(--accent-red);
        border: 1px solid var(--accent-red);
        border-radius: 6px;
        padding: 6px;
        cursor: pointer;
      }
      .ni-hint {
        color: var(--text-muted);
        font-size: var(--fs-sub);
        line-height: 1.5;
      }
    `,
  ],
})
export class NodeInspectorComponent {
  readonly node = input<MapNodeGeo | null>(null);
  readonly nodeChange = output<MapNodeGeo>();
  readonly removeNode = output<string>();

  readonly types = TYPES;
  readonly transitions = TRANSITIONS;
  readonly isGate = computed(() => this.node()?.type === 'gate');

  val(e: Event): string {
    return (e.target as HTMLInputElement | HTMLSelectElement).value;
  }

  patch<K extends keyof MapNodeGeo>(key: K, value: string): void {
    const n = this.node();
    if (!n) return;
    const next = { ...n } as unknown as Record<string, unknown>;
    if (value === '') delete next[key as string];
    else next[key as string] = value;
    this.nodeChange.emit(next as unknown as MapNodeGeo);
  }

  patchNum(key: 'x' | 'y' | 'energyPerHour' | 'activeDayOffset', e: Event): void {
    const n = this.node();
    if (!n) return;
    const v = Number((e.target as HTMLInputElement).value);
    this.nodeChange.emit({ ...n, [key]: Number.isFinite(v) ? v : 0 });
  }

  patchBuff(field: 'key' | 'label' | 'magnitude', value: string): void {
    const n = this.node();
    if (!n) return;
    const buff = { key: '', label: '', magnitude: '', ...n.buff, [field]: value };
    // drop the buff entirely if all fields cleared
    const empty = !buff.key && !buff.label && !buff.magnitude;
    const next = { ...n };
    if (empty) delete next.buff;
    else next.buff = buff;
    this.nodeChange.emit(next);
  }

  patchEffect(value: string): void {
    const n = this.node();
    if (!n) return;
    const next = { ...n };
    if (value) next.effect = { label: value };
    else delete next.effect;
    this.nodeChange.emit(next);
  }

  patchSeed(e: Event): void {
    const n = this.node();
    if (!n) return;
    const checked = (e.target as HTMLInputElement).checked;
    const next = { ...n };
    if (checked) next.seed = true;
    else delete next.seed;
    this.nodeChange.emit(next);
  }

  askDelete(): void {
    const n = this.node();
    if (n && window.confirm(`Delete node "${n.id}"?`)) this.removeNode.emit(n.id);
  }
}
