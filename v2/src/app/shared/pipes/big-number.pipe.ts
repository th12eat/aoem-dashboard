import { Pipe, PipeTransform } from '@angular/core';
import type { NumericValue } from '@shared/models/event-data.model';
import { formatCompact } from '@shared/utils/numeric';

/**
 * Render a value as a compact game number.
 *  - NumericValue → its preserved `display` (keeps the source's exact text).
 *  - raw number   → compacted ("50.2B").
 *  - anything else → "—".
 *
 * Usage: {{ row.points | bigNumber }}
 */
@Pipe({ name: 'bigNumber' })
export class BigNumberPipe implements PipeTransform {
  transform(value: NumericValue | number | null | undefined): string {
    if (value == null) return '—';
    if (typeof value === 'number') return formatCompact(value);
    return value.display || '—';
  }
}
