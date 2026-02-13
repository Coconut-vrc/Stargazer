/**
 * ダブルクォートで囲まれたフィールドに対応した CSV 1行分のパース
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * CSV 全文をパース（改行・ダブルクォート対応）
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const len = text.length;
  let i = 0;
  while (i < len) {
    const c = text[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      i++;
    } else if (c === ',' && !inQuotes) {
      row.push(field);
      field = '';
      i++;
    } else if (c === '\r' && i + 1 < len && text[i + 1] === '\n' && !inQuotes) {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 2;
    } else if (c === '\n' && !inQuotes) {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
    } else if (c === '\r' && !inQuotes) {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
    } else {
      field += c;
      i++;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
