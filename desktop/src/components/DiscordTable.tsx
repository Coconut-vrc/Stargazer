import React from 'react';

export interface DiscordTableColumn<T> {
  header: React.ReactNode;
  headerStyle?: React.CSSProperties;
  renderCell: (row: T, rowIndex: number) => React.ReactNode;
}

export interface DiscordTableProps<T> {
  columns: DiscordTableColumn<T>[];
  rows: T[];
  containerStyle?: React.CSSProperties;
  tableStyle?: React.CSSProperties;
  headerRowStyle?: React.CSSProperties;
  emptyRow?: React.ReactNode;
}

export function DiscordTable<T>({
  columns,
  rows,
  containerStyle,
  tableStyle,
  headerRowStyle,
  emptyRow,
}: DiscordTableProps<T>) {
  return (
    <div style={containerStyle}>
      <table style={tableStyle}>
        <thead>
          <tr style={headerRowStyle}>
            {columns.map((col, index) => (
              <th key={index} style={col.headerStyle}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && emptyRow
            ? emptyRow
            : rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((col, colIndex) => (
                    <React.Fragment key={colIndex}>
                      {col.renderCell(row, rowIndex)}
                    </React.Fragment>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
