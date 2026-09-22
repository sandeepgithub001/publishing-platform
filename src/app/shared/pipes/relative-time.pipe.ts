import { Pipe, PipeTransform } from '@angular/core';

/** Relative time ("3 d ago") from Firestore Timestamp | Date | ms. */
@Pipe({ name: 'relativeTime' })
export class RelativeTimePipe implements PipeTransform {
  transform(value: { toMillis?: () => number } | Date | number | null | undefined): string {
    if (value === null || value === undefined) return '';
    const ms = typeof value === 'number' ? value : value instanceof Date ? value.getTime() : value.toMillis?.() ?? 0;
    if (!ms) return '';
    const diff = Date.now() - ms;
    const future = diff < 0;
    const abs = Math.abs(diff);
    const units: [number, string][] = [
      [60_000, 'min'],
      [3_600_000, 'h'],
      [86_400_000, 'd'],
    ];
    if (abs < 60_000) return 'just now';
    if (abs < 3_600_000) return `${future ? 'in ' : ''}${Math.floor(abs / 60_000)} min${future ? '' : ' ago'}`;
    if (abs < 86_400_000) return `${future ? 'in ' : ''}${Math.floor(abs / 3_600_000)} h${future ? '' : ' ago'}`;
    if (abs < 30 * 86_400_000) return `${future ? 'in ' : ''}${Math.floor(abs / 86_400_000)} d${future ? '' : ' ago'}`;
    return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
