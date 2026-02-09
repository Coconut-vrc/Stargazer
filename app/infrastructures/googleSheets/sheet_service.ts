// F:\DEVELOPFOLDER\dev-core\app\infrastructures\googleSheets\sheet_service.ts
export class SheetService {
  private extractId(url: string): string {
    const match = url.match(/\/d\/([^/]+)/);
    return match ? match[1] : url;
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
}