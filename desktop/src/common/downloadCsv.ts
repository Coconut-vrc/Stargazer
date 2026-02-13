/**
 * CSV 文字列を生成してブラウザでダウンロードする。
 * 完全ローカル用（API 不要）。
 */

function escapeCsvCell(value: string | number): string {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * 二次元配列を CSV 文字列にし、指定ファイル名でダウンロードする。
 */
export function downloadCsv(rows: (string | number)[][], filename: string): void {
  const csvLine = (row: (string | number)[]) => row.map(escapeCsvCell).join(',');
  const body = rows.map(csvLine).join('\r\n');
  const bom = '\uFEFF';
  const blob = new Blob([bom + body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
