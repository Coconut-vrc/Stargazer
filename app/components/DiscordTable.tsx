import React from "react";

export interface DiscordTableColumn<T> {
  header: React.ReactNode;
  headerStyle?: React.CSSProperties;
  renderCell: (row: T, rowIndex: number) => React.ReactNode;
}

export interface DiscordTableProps<T> {
  columns: DiscordTableColumn<T>[];
  rows: T[];
  /** テーブル全体を包むコンテナのスタイル（背景・枠など） */
  containerStyle?: React.CSSProperties;
  /** table 要素自体のスタイル（幅・borderCollapse など） */
  tableStyle?: React.CSSProperties;
  /** thead > tr のスタイル */
  headerRowStyle?: React.CSSProperties;
  /** tbody が空のときの行（例: 「当選者がいません」） */
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

