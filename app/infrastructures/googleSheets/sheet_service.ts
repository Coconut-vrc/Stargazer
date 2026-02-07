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
}