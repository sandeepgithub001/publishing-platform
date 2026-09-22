import { Pipe, PipeTransform } from '@angular/core';

/** "~4 min read" from readingMinutes. */
@Pipe({ name: 'readingTime' })
export class ReadingTimePipe implements PipeTransform {
  transform(minutes: number | null | undefined): string {
    const m = Math.max(1, Math.round(minutes ?? 1));
    return `${m} min read`;
  }
}
