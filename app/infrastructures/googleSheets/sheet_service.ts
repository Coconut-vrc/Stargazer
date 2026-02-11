// app/infrastructures/googleSheets/sheet_service.ts
export class SheetService {
  /**
   * Google SheetsのURLからspreadsheetIdを抽出
   * セキュリティ: URLの形式を検証してからIDを抽出
   */
  private extractId(url: string): string {
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL format');
    }

    // Google Sheets URLの形式を検証
    // https://docs.google.com/spreadsheets/d/{ID}/edit または {ID}のみ
    const urlPattern = /\/d\/([a-zA-Z0-9_-]{20,60})/;
    const match = url.match(urlPattern);
    
    if (match && match[1]) {
      return match[1];
    }

    // URL形式でない場合は、直接IDとして扱う（ただし形式検証）
    const idPattern = /^[a-zA-Z0-9_-]{20,60}$/;
    if (idPattern.test(url.trim())) {
      return url.trim();
    }

    throw new Error('Invalid spreadsheet URL or ID format');
  }

  async fetchSheetData(url: string, range: string): Promise<any[]> {
    const spreadsheetId = this.extractId(url);
    const response = await fetch('/api/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spreadsheetId, range }),
    });
    if (!response.ok) throw new Error('取得に失敗したよ');
    const data = await response.json();
    return data.values || [];
  }

  async updateSheetData(url: string, range: string, values: any[][]): Promise<void> {
    const spreadsheetId = this.extractId(url);
    const response = await fetch('/api/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spreadsheetId, range, values, method: 'UPDATE' }),
    });
    if (!response.ok) throw new Error('更新に失敗したよ');
  }

  /**
   * 新しいシートを作成してデータを書き込む
   * @param url スプレッドシートのURL
   * @param sheetName 作成するシート名
   * @param values 書き込むデータ（2次元配列）
   */
  async createSheetAndWriteData(url: string, sheetName: string, values: any[][]): Promise<void> {
    const spreadsheetId = this.extractId(url);

    // 1. 新しいシートを作成
    const createResponse = await fetch('/api/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spreadsheetId, sheetName, method: 'CREATE_SHEET' }),
    });
    if (!createResponse.ok) {
      const error = await createResponse.json();
      throw new Error(`シート作成に失敗: ${error.error}`);
    }

    // 2. データを書き込む
    const range = `${sheetName}!A1`;
    const writeResponse = await fetch('/api/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spreadsheetId, range, values, method: 'UPDATE' }),
    });
    if (!writeResponse.ok) {
      throw new Error('データ書き込みに失敗したよ');
    }
  }

  /**
   * 指定スプレッドシート内のシート名一覧を取得
   */
  async listSheets(url: string): Promise<string[]> {
    const spreadsheetId = this.extractId(url);
    const response = await fetch('/api/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spreadsheetId, method: 'LIST_SHEETS' }),
    });
    if (!response.ok) throw new Error('シート一覧の取得に失敗したよ');
    const data = await response.json();
    return (data.sheets as string[]) || [];
  }
}