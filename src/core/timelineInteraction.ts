import type { RowLayout } from './rowLayout';

export function pixelToDate(x: number, rangeStart: Date, msPerPixel: number): Date {
  return new Date(rangeStart.getTime() + x * msPerPixel);
}

export function resolveRowAtY(y: number, rowLayouts: RowLayout[]): number | null {
  for (let i = 0; i < rowLayouts.length; i++) {
    const row = rowLayouts[i];
    if (y >= row.y && y < row.y + row.height) return i;
  }
  return null;
}
