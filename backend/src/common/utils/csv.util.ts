/**
 * Minimal CSV serializer — no external dependency needed for the export feature.
 * Escapes values containing commas, quotes or newlines per RFC 4180.
 */
export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | undefined | null;
}

function escapeCsvValue(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  const stringValue = String(value);
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map(col => escapeCsvValue(col.header)).join(',');
  const lines = rows.map(row => columns.map(col => escapeCsvValue(col.value(row))).join(','));
  // Prefix with UTF-8 BOM so Excel opens diacritics (č, ć, š, ž, đ) correctly.
  return '﻿' + [header, ...lines].join('\r\n');
}
