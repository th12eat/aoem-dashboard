import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * A 1v1 "lean" indicator (1.0 TME): three fixed, evenly-spaced slots "‹ · ›".
 * Exactly one is lit — LEFT ‹ green when our value is higher, RIGHT › red when
 * theirs is, CENTER · grey on a tie. The other two render transparent so the
 * spacing stays constant and the arrow clearly leans toward the stronger side.
 * Higher value = stronger. Used between the two server columns of the tier /
 * depth tables when exactly two servers are compared.
 */
@Component({
  selector: 'app-lean-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="lean">
      <span [style.color]="active() === 'l' ? 'var(--accent-green, #4ade80)' : 'transparent'">‹</span>
      <span [style.color]="active() === 'c' ? '#64748b' : 'transparent'">·</span>
      <span [style.color]="active() === 'r' ? 'var(--accent-red, #f87171)' : 'transparent'">›</span>
    </span>
  `,
  styles: [
    `
      .lean {
        display: inline-flex;
        gap: 4px;
        justify-content: center;
        font-family: var(--font-mono, monospace);
        font-weight: 700;
        letter-spacing: 1px;
      }
    `,
  ],
})
export class LeanIndicatorComponent {
  /** Our value (left/green side). */
  readonly us = input<number | null>(null);
  /** Their value (right/red side). */
  readonly them = input<number | null>(null);

  readonly active = computed<'l' | 'c' | 'r'>(() => {
    const u = this.us() ?? 0;
    const t = this.them() ?? 0;
    return u > t ? 'l' : t > u ? 'r' : 'c';
  });
}
