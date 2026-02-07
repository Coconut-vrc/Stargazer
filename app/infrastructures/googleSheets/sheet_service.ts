// F:\DEVELOPFOLDER\dev-core\app\infrastructures\googleSheets\sheet_service.ts

export class SheetService {
  /**
   * URLからSpreadsheetIDを抽出する
   * 例: https://docs.google.com/spreadsheets/d/12345/edit -> 12345
   */
  private extractId(url: string): string {
    const match = url.match(/\/d\/([^/]+)/);
    return match ? match[1] : url;
  }

  /**
   * 指定したURLと範囲からデータを取得する
   * /api/sheets に作成するAPIエンドポイントを経由して取得
   */
  async fetchSheetData(url: string, range: string): Promise<any[]> {
    const spreadsheetId = this.extractId(url);
    
    // 自作のAPIルート (/api/sheets/route.ts) を叩く
    const response = await fetch('/api/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spreadsheetId, range }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`APIエラー: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data.values || [];
  }

  // 下記は互換性のために残す（中身はfetchSheetDataを使う）
  async fetchUserData(url: string): Promise<any[]> {
    return this.fetchSheetData(url, 'A2:G100'); // 範囲はシート構造に合わせる
  }

  async fetchCastData(url: string): Promise<any[]> {
    return this.fetchSheetData(url, 'A2:B50'); // 範囲はシート構造に合わせる
  }
}